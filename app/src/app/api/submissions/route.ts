import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { findOrCreateSubmission } from '@/lib/submissions/repository'
import { findOrCreateReadingSubmission } from '@/lib/reading/repository'
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

  // Try oral assessment first, then reading assessment
  const oralAssignment = await findAssignmentWithConfig(body.assignmentId as AssignmentId)

  if (oralAssignment) {
    if (oralAssignment.courseId !== session.courseId) return apiError('Assignment not found', 404)
    if (oralAssignment.status !== 'published') return apiError('Assignment not found', 404)

    const { submissionId, alreadySubmitted } = await findOrCreateSubmission(
      oralAssignment.id,
      session.userId
    )

    if (alreadySubmitted) {
      const response: CreateSubmissionResponse = { submissionId, uploadUrl: '', alreadySubmitted: true }
      return NextResponse.json(response, { status: 200 })
    }

    const storagePath = responseRecordingPath(session.registrationId, oralAssignment.id, submissionId)
    const uploadUrl = await createSignedUploadUrl(storagePath)

    const response: CreateSubmissionResponse = { submissionId, uploadUrl }
    return NextResponse.json(response, { status: 201 })
  }

  const readingAssignment = await findReadingAssignmentWithConfig(body.assignmentId as AssignmentId)
  if (!readingAssignment || readingAssignment.courseId !== session.courseId) {
    return apiError('Assignment not found', 404)
  }
  if (readingAssignment.status !== 'published') return apiError('Assignment not found', 404)

  const { submissionId, alreadySubmitted, currentSectionIndex } =
    await findOrCreateReadingSubmission(
      readingAssignment.id,
      session.userId,
      readingAssignment.config.sections.length
    )

  if (alreadySubmitted) {
    const response: CreateSubmissionResponse = {
      submissionId,
      uploadUrl: '',
      alreadySubmitted: true,
      currentSectionIndex,
    }
    return NextResponse.json(response, { status: 200 })
  }

  const response: CreateSubmissionResponse = { submissionId, uploadUrl: '', currentSectionIndex }
  return NextResponse.json(response, { status: 201 })
}
