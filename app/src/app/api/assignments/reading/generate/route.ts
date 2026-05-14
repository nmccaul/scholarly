import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getMaterialsByIds } from '@/lib/materials/repository'
import { generateReadingAssignmentDetails } from '@/lib/ai/generate-reading'
import { apiError } from '@/lib/api/response'
import type { GenerateReadingAssignmentRequest, GenerateReadingAssignmentResponse } from '@/types/api'
import type { CourseMaterialId } from '@/types/domain'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

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

    // All materials (including PDF ones) use their stored extracted text.
    // PDF splitting is handled separately by the process-pdf route.
    const materials = [
      ...libraryMaterials.map((m) => ({ title: m.title, content: m.content })),
      ...assignmentMaterials.map((m) => ({ title: m.title, content: m.content })),
    ]

    const result = await generateReadingAssignmentDetails({ materials, direction })

    const response: GenerateReadingAssignmentResponse = result
    return NextResponse.json(response)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Reading assignment generation failed:', msg)
    return apiError(`Generation failed: ${msg}`, 500)
  }
}
