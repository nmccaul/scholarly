import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getMaterialsByIds } from '@/lib/materials/repository'
import { generateReadingAssignmentDetails } from '@/lib/ai/generate-reading'
import { getOpenAIClient } from '@/lib/ai/client'
import { createServiceClient } from '@/lib/supabase/client'
import { sectionPdfPath, uploadPdf } from '@/lib/storage/materials'
import { splitPdfByPageRanges } from '@/lib/pdf/split'
import { PDFParse } from 'pdf-parse'
import { apiError } from '@/lib/api/response'
import type { GenerateReadingAssignmentRequest, GenerateReadingAssignmentResponse } from '@/types/api'
import type { CourseMaterialId } from '@/types/domain'

const MAX_DIRECTION_LENGTH = 2000

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return apiError('Internal server error', 500)
  }

  let body: GenerateReadingAssignmentRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { materialIds = [], assignmentMaterials = [], direction = '' } = body

  if (!Array.isArray(materialIds) || !Array.isArray(assignmentMaterials)) {
    return apiError('materialIds and assignmentMaterials must be arrays', 400)
  }

  if (materialIds.length === 0 && assignmentMaterials.length === 0) {
    return apiError('At least one material is required to generate a reading assignment', 400)
  }

  if (typeof direction === 'string' && direction.length > MAX_DIRECTION_LENGTH) {
    return apiError(`direction must be ${MAX_DIRECTION_LENGTH} characters or fewer`, 400)
  }

  try {
    const libraryMaterials = materialIds.length > 0
      ? await getMaterialsByIds(materialIds as CourseMaterialId[], session.courseId)
      : []

    // If exactly one PDF material is selected with no additional text materials,
    // run the PDF splitting pipeline so students read from the original document.
    const pdfMaterials = libraryMaterials.filter((m) => m.pdfStoragePath)
    const textMaterials = libraryMaterials.filter((m) => !m.pdfStoragePath)
    const usePdfPipeline =
      pdfMaterials.length === 1 &&
      textMaterials.length === 0 &&
      assignmentMaterials.length === 0

    if (usePdfPipeline) {
      const material = pdfMaterials[0]!
      const db = createServiceClient()

      // Download the PDF from storage
      const { data: fileData, error: downloadError } = await db.storage
        .from('materials')
        .download(material.pdfStoragePath!)
      if (downloadError || !fileData) {
        return apiError('Failed to load PDF from storage', 500)
      }
      const buffer = Buffer.from(await fileData.arrayBuffer())

      // Extract per-page text
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      const totalPages = result.total
      const pageTexts = result.pages.map((p) => p.text.trim())

      if (pageTexts.length === 0 || pageTexts.every((t) => !t)) {
        return apiError('No readable text found in this PDF.', 422)
      }

      // AI section split
      const client = getOpenAIClient()
      const pageList = pageTexts.map((text, i) => `Page ${i + 1}:\n${text.slice(0, 800)}`).join('\n\n')

      let aiSections: Array<{ title: string; startPage: number; endPage: number }>
      try {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You divide academic PDFs into logical reading sections for students. ' +
                'Splits must occur ONLY at complete page boundaries. Respond with JSON only.',
            },
            {
              role: 'user',
              content:
                `This PDF has ${totalPages} pages. Here is each page's content:\n\n${pageList}\n\n` +
                `${direction ? `Instructor direction: ${direction}\n\n` : ''}` +
                'Divide into 2–5 sections at natural content breaks. Every page must belong to exactly one section. ' +
                'Also suggest an assignment title. startPage and endPage are 1-indexed and inclusive. ' +
                'Return: { "title": string, "sections": [{ "title": string, "startPage": number, "endPage": number }] }',
            },
          ],
        })

        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as {
          title?: string
          sections?: Array<{ title: string; startPage: number; endPage: number }>
        }

        if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) throw new Error('no sections')

        aiSections = parsed.sections.map((s) => ({
          title: String(s.title).trim().slice(0, 200) || 'Untitled Section',
          startPage: Math.max(1, Math.round(Number(s.startPage))),
          endPage: Math.min(totalPages, Math.round(Number(s.endPage))),
        }))

        // Build and return PDF sections with default rubric
        const splitBuffers = await splitPdfByPageRanges(
          buffer,
          aiSections.map((s) => ({ startPage: s.startPage, endPage: s.endPage }))
        )

        const uploadResults = await Promise.allSettled(
          splitBuffers.map(async (buf) => {
            const path = sectionPdfPath(session.courseId, crypto.randomUUID())
            await uploadPdf(path, buf)
            return path
          })
        )

        const sections = aiSections.map((s, i) => {
          const upload = uploadResults[i]
          const pdfStoragePath = upload?.status === 'fulfilled' ? upload.value : undefined
          const content = pageTexts.slice(s.startPage - 1, s.endPage).join('\n').slice(0, 50000)
          return {
            title: s.title,
            content: content || `Pages ${s.startPage}–${s.endPage}`,
            sourceType: 'pdf' as const,
            ...(pdfStoragePath ? { pdfStoragePath } : {}),
          }
        })

        const response: GenerateReadingAssignmentResponse = {
          title: (parsed.title?.trim().slice(0, 200)) || material.title,
          sections,
          rubric: [
            { label: 'Critical Engagement', description: 'Demonstrates genuine engagement with the ideas and arguments in the reading', maxPoints: 10 },
            { label: 'Comprehension', description: 'Accurately understands and can explain the key content of each section', maxPoints: 10 },
          ],
        }
        return NextResponse.json(response)
      } catch (e) {
        console.error('PDF pipeline failed in generate:', e)
        return apiError('Failed to process PDF. Please try again.', 500)
      }
    }

    // Text-based generation path
    const materials = [
      ...libraryMaterials.map((m) => ({ title: m.title, content: m.content })),
      ...assignmentMaterials.map((m) => ({ title: m.title, content: m.content })),
    ]

    const result = await generateReadingAssignmentDetails({ materials, direction })

    const response: GenerateReadingAssignmentResponse = result
    return NextResponse.json(response)
  } catch (e) {
    console.error('Reading assignment generation failed:', e)
    return apiError('Generation failed. Please try again.', 500)
  }
}
