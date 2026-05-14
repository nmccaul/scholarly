import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError, requireInstructor, ForbiddenError } from '@/lib/lti/session'
import { findAssignmentWithConfig, deleteAssignment, updateAssignment, getAssignmentCourseId } from '@/lib/assignments/repository'
import { replaceAssignmentMaterials } from '@/lib/materials/repository'
import { validateOralAssessmentBody } from '@/lib/assignments/validation'
import { apiError } from '@/lib/api/response'
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
    if (e instanceof SessionError) return apiError(e.message, 401)
    throw e
  }

  const { id } = await params
  const assignment = await findAssignmentWithConfig(id as AssignmentId)
  // 404 on missing OR wrong course — don't leak cross-course existence
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

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
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    throw e
  }

  let body: UpdateOralAssessmentRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const validationError = validateOralAssessmentBody(body)
  if (validationError) return apiError(validationError, 400)

  const { id } = await params
  const assignment = await findAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

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
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    throw e
  }

  const { id } = await params
  const courseId = await getAssignmentCourseId(id as AssignmentId)
  if (!courseId || courseId !== session.courseId) return apiError('Assignment not found', 404)

  await deleteAssignment(id as AssignmentId)
  return NextResponse.json({ ok: true })
}
