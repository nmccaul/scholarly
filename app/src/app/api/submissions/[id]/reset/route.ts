import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getSubmissionAsTeacher, resetSubmission } from '@/lib/submissions/repository'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { resetReadingSubmission } from '@/lib/reading/repository'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'

export async function POST(
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
  const submission = await getSubmissionAsTeacher(id as SubmissionId)
  if (!submission) return apiError('Submission not found', 404)

  // Resolve assignment in either flavor — oral or reading — and reset using
  // the matching repository function.
  const oral = await findAssignmentWithConfig(submission.assignmentId)
  if (oral) {
    if (oral.courseId !== session.courseId) return apiError('Assignment not found', 404)
    await resetSubmission(submission.submissionId)
    return NextResponse.json({ ok: true })
  }

  const reading = await findReadingAssignmentWithConfig(submission.assignmentId)
  if (reading) {
    if (reading.courseId !== session.courseId) return apiError('Assignment not found', 404)
    await resetReadingSubmission(submission.submissionId)
    return NextResponse.json({ ok: true })
  }

  return apiError('Assignment not found', 404)
}
