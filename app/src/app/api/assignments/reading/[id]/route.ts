import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError, requireInstructor, ForbiddenError } from '@/lib/lti/session'
import { findReadingAssignmentWithConfig, deleteAssignment, updateReadingAssignment } from '@/lib/assignments/repository'
import { validateReadingAssessmentBody } from '@/lib/assignments/validation'
import { apiError } from '@/lib/api/response'
import type { AssignmentId } from '@/types/domain'
import type { UpdateReadingAssessmentRequest } from '@/types/api'

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
  const assignment = await findReadingAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

  return NextResponse.json({
    id: assignment.id,
    courseId: assignment.courseId,
    title: assignment.title,
    type: assignment.type,
    status: assignment.status,
    pointsPossible: assignment.pointsPossible,
    config: assignment.config,
  })
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

  let body: UpdateReadingAssessmentRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const validationError = validateReadingAssessmentBody(body)
  if (validationError) return apiError(validationError, 400)

  const { id } = await params
  const assignment = await findReadingAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

  const pointsPossible = body.rubric.reduce((sum, c) => sum + c.maxPoints, 0)

  await updateReadingAssignment(assignment.id, {
    title: body.title,
    pointsPossible,
    sections: body.sections,
    checkpointType: body.checkpointType,
    maxFollowUps: body.maxFollowUps,
    aiGradingEnabled: body.aiGradingEnabled,
    rubric: body.rubric,
    checkpointPassMode: body.checkpointPassMode,
    checkpointActions: body.checkpointActions,
  })

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
  const assignment = await findReadingAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

  await deleteAssignment(assignment.id)
  return NextResponse.json({ ok: true })
}
