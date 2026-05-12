import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getSubmissionAsTeacher, resetSubmission } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
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

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)

  await resetSubmission(submission.submissionId)

  return NextResponse.json({ ok: true })
}
