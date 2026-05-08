import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError, requireInstructor, ForbiddenError } from '@/lib/lti/session'
import { findAssignmentWithConfig, deleteAssignment, updateAssignment } from '@/lib/assignments/repository'
import { replaceAssignmentMaterials } from '@/lib/materials/repository'
import type { AssignmentId } from '@/types/domain'
import type { AssignmentConfigResponse, UpdateOralAssessmentRequest } from '@/types/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    throw e
  }

  const { id } = await params
  const assignment = await findAssignmentWithConfig(id as AssignmentId)
  // 404 on missing OR wrong course — don't leak cross-course existence
  if (!assignment || assignment.courseId !== session.courseId) return err('Assignment not found', 404)

  const response: AssignmentConfigResponse = {
    id: assignment.id,
    courseId: assignment.courseId,
    title: assignment.title,
    type: 'oral_assessment',
    status: assignment.status,
    pointsPossible: assignment.pointsPossible,
    config: assignment.config,
  }

  return NextResponse.json(response)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  let body: UpdateOralAssessmentRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const validationError = validateUpdate(body)
  if (validationError) return err(validationError, 400)

  const { id } = await params
  const assignment = await findAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return err('Assignment not found', 404)

  const pointsPossible = body.rubric.reduce((sum, c) => sum + c.maxPoints, 0)

  await updateAssignment(assignment.id, {
    title: body.title,
    pointsPossible,
    prompt: body.prompt,
    preparationTimeSeconds: body.preparationTimeSeconds,
    maxResponseTimeSeconds: body.maxResponseTimeSeconds,
    followUpQuestionCount: body.followUpQuestionCount,
    cameraRequired: body.cameraRequired,
    aiGradingEnabled: body.aiGradingEnabled,
    rubric: body.rubric,
    selectedMaterialIds: body.selectedMaterialIds,
  })

  if (body.assignmentMaterials !== undefined) {
    await replaceAssignmentMaterials(
      assignment.id,
      assignment.courseId,
      session.userId,
      body.assignmentMaterials
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  const { id } = await params
  const assignment = await findAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return err('Assignment not found', 404)

  await deleteAssignment(assignment.id)
  return NextResponse.json({ ok: true })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateUpdate(body: UpdateOralAssessmentRequest): string | null {
  if (!body.title || body.title.length < 1 || body.title.length > 200) {
    return 'title must be 1–200 characters'
  }
  if (!body.prompt || body.prompt.length < 10 || body.prompt.length > 2000) {
    return 'prompt must be 10–2000 characters'
  }
  if (body.preparationTimeSeconds < 0 || body.preparationTimeSeconds > 300) {
    return 'preparationTimeSeconds must be 0–300'
  }
  if (body.maxResponseTimeSeconds < 30 || body.maxResponseTimeSeconds > 600) {
    return 'maxResponseTimeSeconds must be 30–600'
  }
  if (body.followUpQuestionCount < 0 || body.followUpQuestionCount > 5) {
    return 'followUpQuestionCount must be 0–5'
  }
  if (!body.rubric || body.rubric.length < 1 || body.rubric.length > 6) {
    return 'rubric must have 1–6 criteria'
  }
  for (const criterion of body.rubric) {
    if (!criterion.label || criterion.label.length < 1 || criterion.label.length > 100) {
      return 'each rubric criterion label must be 1–100 characters'
    }
    if (!criterion.description || criterion.description.length < 1 || criterion.description.length > 500) {
      return 'each rubric criterion description must be 1–500 characters'
    }
    if (!Number.isFinite(criterion.maxPoints) || criterion.maxPoints < 1 || criterion.maxPoints > 100) {
      return 'each rubric criterion maxPoints must be 1–100'
    }
  }
  if (body.selectedMaterialIds !== undefined) {
    if (!Array.isArray(body.selectedMaterialIds)) return 'selectedMaterialIds must be an array'
    if (body.selectedMaterialIds.some((id) => !UUID_RE.test(id))) return 'selectedMaterialIds must be valid UUIDs'
  }
  if (body.assignmentMaterials !== undefined) {
    if (!Array.isArray(body.assignmentMaterials)) return 'assignmentMaterials must be an array'
    for (const m of body.assignmentMaterials) {
      if (!m.title || m.title.length < 1 || m.title.length > 200) return 'each material title must be 1–200 characters'
      if (!m.content || m.content.length < 1 || m.content.length > 50000) return 'each material content must be 1–50,000 characters'
    }
  }
  return null
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
