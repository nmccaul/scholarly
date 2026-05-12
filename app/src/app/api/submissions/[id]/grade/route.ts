import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getSubmissionAsTeacher, overrideGrade } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { findRegistrationById } from '@/lib/lti/registrations'
import { syncGradeToCanvas } from '@/lib/lti/grade-sync'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'
import type { GradeOverrideRequest, GradeOverrideResponse } from '@/types/api'

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

  let body: GradeOverrideRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!Number.isFinite(body.finalGrade) || body.finalGrade < 0) {
    return apiError('finalGrade must be a non-negative number', 400)
  }

  const { id } = await params
  const submission = await getSubmissionAsTeacher(id as SubmissionId)
  if (!submission) return apiError('Submission not found', 404)

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

  if (body.finalGrade > assignment.pointsPossible) {
    return apiError(`finalGrade cannot exceed pointsPossible (${assignment.pointsPossible})`, 400)
  }

  const teacherFeedback = body.teacherFeedback?.trim() ?? null

  await overrideGrade({
    submissionId: submission.submissionId,
    finalGrade: body.finalGrade,
    teacherFeedback,
    gradedBy: session.userId,
  })

  // AGS passback — best-effort, never fails the response
  let syncStatus: 'success' | 'failed' | null = null

  if (assignment.ltiLineitemUrl && submission.studentLtiSub) {
    const registration = await findRegistrationById(session.registrationId)
    if (registration) {
      syncStatus = await syncGradeToCanvas({
        registration,
        lineitemUrl: assignment.ltiLineitemUrl,
        ltiSub: submission.studentLtiSub,
        scoreGiven: body.finalGrade,
        scoreMaximum: assignment.pointsPossible,
        submissionId: submission.submissionId,
      })
    }
  }

  const response: GradeOverrideResponse = {
    finalGrade: body.finalGrade,
    teacherFeedback,
    syncStatus,
  }
  return NextResponse.json(response)
}
