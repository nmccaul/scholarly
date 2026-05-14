import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { apiError } from '@/lib/api/response'
import { getOpenAIClient } from '@/lib/ai/client'
import { sectionPdfPath, uploadPdf } from '@/lib/storage/materials'
import { splitPdfByPageRanges } from '@/lib/pdf/split'
import { PDFParse } from 'pdf-parse'
import type { ProcessPdfResponse, ProcessPdfSectionResult } from '@/types/api'

export const dynamic = 'force-dynamic'

const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_PAGES_PER_SECTION_TEXT = 50000

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

  // 1. Extract per-page text using getText() which returns pages array
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

  // 2. AI section split — instruct to split only at page boundaries
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
    // Fallback: one section covering all pages
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
