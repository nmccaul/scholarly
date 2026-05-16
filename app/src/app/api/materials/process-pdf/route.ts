import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { apiError } from '@/lib/api/response'
import { getOpenAIClient } from '@/lib/ai/client'
import { sectionPdfPath, uploadPdf } from '@/lib/storage/materials'
import { splitPdfByPageRanges } from '@/lib/pdf/split'
import type { ProcessPdfResponse, ProcessPdfSectionResult } from '@/types/api'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_PAGES_PER_SECTION_TEXT = 50000

// Polyfill DOMMatrix for environments where @napi-rs/canvas is unavailable.
// pdfjs-dist/legacy creates `const SCALE_MATRIX = new DOMMatrix()` at module
// init time; without this stub the cold-start crashes before we parse anything.
function ensureDomMatrix() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrixStub {
      a=1; b=0; c=0; d=1; e=0; f=0
      m11=1; m12=0; m13=0; m14=0
      m21=0; m22=1; m23=0; m24=0
      m31=0; m32=0; m33=1; m34=0
      m41=0; m42=0; m43=0; m44=1
      is2D=true; isIdentity=true
      constructor(_init?: string | number[]) {}
    }
    (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixStub
  }
}

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    return apiError('Internal server error', 500)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('Invalid form data', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return apiError('No file provided', 400)
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return apiError('File must be a PDF', 400)
  }
  if (file.size > MAX_PDF_BYTES) return apiError('PDF must be under 5 MB', 400)

  const buffer = Buffer.from(await file.arrayBuffer())

  // Load pdf-parse dynamically AFTER the DOMMatrix polyfill is in place.
  // Static imports run before handler code and would crash on cold start when
  // @napi-rs/canvas (pdfjs-dist's DOMMatrix source) is unavailable.
  ensureDomMatrix()
  const { PDFParse } = await import('pdf-parse')

  // 1. Extract per-page text
  let pageTexts: string[] = []
  let totalPages = 0

  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    totalPages = result.total
    pageTexts = result.pages.map((p) => p.text.trim())
  } catch (e) {
    console.error('pdf-parse failed:', e)
    return apiError('Could not read that PDF. It may be encrypted or corrupted.', 422)
  }

  if (pageTexts.length === 0 || pageTexts.every((t) => !t)) {
    return apiError('No readable text found in this PDF.', 422)
  }

  // 2. AI section split
  let aiSections: Array<{ title: string; startPage: number; endPage: number }>
  try {
    const client = getOpenAIClient()
    const pageList = pageTexts
      .map((text, i) => `Page ${i + 1}:\n${text.slice(0, 800)}`)
      .join('\n\n')

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You divide academic PDFs into logical reading sections for students. ' +
            'Splits must occur ONLY at complete page boundaries — never mid-page. ' +
            'Respond with JSON only.',
        },
        {
          role: 'user',
          content:
            `This PDF has ${totalPages} pages. Here is each page's content:\n\n${pageList}\n\n` +
            'Divide into 2–5 sections at natural content breaks (chapters, topics, major shifts). ' +
            'Every page must belong to exactly one section. startPage and endPage are 1-indexed and inclusive. ' +
            'Return: { "sections": [{ "title": string, "startPage": number, "endPage": number }] }',
        },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as {
      sections?: Array<{ title: string; startPage: number; endPage: number }>
    }

    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      throw new Error('AI returned no sections')
    }

    aiSections = parsed.sections.map((s) => ({
      title: String(s.title).trim().slice(0, 200) || 'Untitled Section',
      startPage: Math.max(1, Math.round(Number(s.startPage))),
      endPage: Math.min(totalPages, Math.round(Number(s.endPage))),
    }))
  } catch (e) {
    console.error('AI section split failed:', e)
    aiSections = [{ title: 'Full Document', startPage: 1, endPage: totalPages }]
  }

  // 3. Split PDF by page ranges
  let splitBuffers: Buffer[]
  try {
    splitBuffers = await splitPdfByPageRanges(
      buffer,
      aiSections.map((s) => ({ startPage: s.startPage, endPage: s.endPage }))
    )
  } catch (e) {
    console.error('PDF splitting failed:', e)
    return apiError('Failed to split PDF into sections.', 500)
  }

  // 4. Upload each slice to Supabase Storage in parallel
  const uploadResults = await Promise.allSettled(
    splitBuffers.map(async (buf) => {
      const path = sectionPdfPath(session.courseId, crypto.randomUUID())
      await uploadPdf(path, buf)
      return path
    })
  )

  // 5. Assemble response
  const sections: ProcessPdfSectionResult[] = []
  for (let i = 0; i < aiSections.length; i++) {
    const s = aiSections[i]!
    const uploadResult = uploadResults[i]
    if (uploadResult?.status !== 'fulfilled') {
      console.error(`Failed to upload section ${i + 1}:`, (uploadResult as PromiseRejectedResult).reason)
      return apiError('Failed to store PDF sections. Please try again.', 500)
    }

    const sectionPageTexts = pageTexts.slice(s.startPage - 1, s.endPage)
    const content = sectionPageTexts.join('\n').slice(0, MAX_PAGES_PER_SECTION_TEXT)

    sections.push({
      title: s.title,
      content: content || `Pages ${s.startPage}–${s.endPage}`,
      pdfStoragePath: uploadResult.value,
      startPage: s.startPage,
      endPage: s.endPage,
    })
  }

  const response: ProcessPdfResponse = { sections, totalPages }
  return NextResponse.json(response)
}
