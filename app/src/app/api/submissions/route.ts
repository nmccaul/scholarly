import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { findOrCreateSubmission } from '@/lib/submissions/repository'
import { createSignedUploadUrl, responseRecordingPath } from '@/lib/storage/recordings'
import { apiError } from '@/lib/api/response'
import type { AssignmentId } from '@/types/domain'
import type { CreateSubmissionResponse } from '@/types/api'

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    throw e
  }

  let body: { assignmentId: string }
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.assignmentId) return apiError('assignmentId is required', 400)

  const assignment = await findAssignmentWithConfig(body.assignmentId as AssignmentId)
  // 404 on missing, wrong course, or non-published — don't leak draft existence
  if (!assignment || assignment.courseId !== session.courseId) return apiError('Assignment not found', 404)
  if (assignment.status !== 'published') return apiError('Assignment not found', 404)

  const { submissionId, alreadySubmitted } = await findOrCreateSubmission(
    assignment.id,
    session.userId
  )

  if (alreadySubmitted) {
    const response: CreateSubmissionResponse = { submissionId, uploadUrl: '', alreadySubmitted: true }
    return NextResponse.json(response, { status: 200 })
  }

  const storagePath = responseRecordingPath(session.registrationId, assignment.id, submissionId)
  const uploadUrl = await createSignedUploadUrl(storagePath)

  const response: CreateSubmissionResponse = { submissionId, uploadUrl }
  return NextResponse.json(response, { status: 201 })
}
