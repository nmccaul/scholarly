import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getMaterialsByIds } from '@/lib/materials/repository'
import { generateAssignmentDetails } from '@/lib/ai/generate-assignment'
import type { GenerateAssignmentRequest, GenerateAssignmentResponse } from '@/types/api'
import type { CourseMaterialId } from '@/types/domain'

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return err('Internal server error', 500)
  }

  let body: GenerateAssignmentRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const { materialIds = [], assignmentMaterials = [], direction = '' } = body

  if (!Array.isArray(materialIds) || !Array.isArray(assignmentMaterials)) {
    return err('materialIds and assignmentMaterials must be arrays', 400)
  }

  if (materialIds.length === 0 && assignmentMaterials.length === 0) {
    return err('At least one material is required to generate an assignment', 400)
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
    return err('Generation failed. Please try again.', 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
