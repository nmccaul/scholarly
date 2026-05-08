import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { getSubmissionAsTeacher, resetSubmission } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import type { SubmissionId } from '@/types/domain'

export async function POST(
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
  const submission = await getSubmissionAsTeacher(id as SubmissionId)
  if (!submission) return err('Submission not found', 404)

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return err('Assignment not found', 404)

  await resetSubmission(submission.submissionId)

  return NextResponse.json({ ok: true })
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
