import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getMaterialsByIds } from '@/lib/materials/repository'
import { generateAssignmentDetails } from '@/lib/ai/generate-assignment'
import { apiError } from '@/lib/api/response'
import type { GenerateAssignmentRequest, GenerateAssignmentResponse } from '@/types/api'
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

  let body: GenerateAssignmentRequest
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
    return apiError('At least one material is required to generate an assignment', 400)
  }

  if (typeof direction === 'string' && direction.length > MAX_DIRECTION_LENGTH) {
    return apiError(`direction must be ${MAX_DIRECTION_LENGTH} characters or fewer`, 400)
  }

  try {
    const libraryMaterials = materialIds.length > 0
      ? await getMaterialsByIds(materialIds as CourseMaterialId[], session.courseId)
      : []

    const materials = [
      ...libraryMaterials.map((m) => ({ title: m.title, content: m.content })),
      ...assignmentMaterials.map((m) => ({ title: m.title, content: m.content })),
    ]

    const result = await generateAssignmentDetails({ materials, direction })

    const response: GenerateAssignmentResponse = result
    return NextResponse.json(response)
  } catch (e) {
    console.error('Assignment generation failed:', e)
    return apiError('Generation failed. Please try again.', 500)
  }
}
