import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, updateTranscript, updateRecordingUrl } from '@/lib/submissions/repository'
import { responseRecordingPath } from '@/lib/storage/recordings'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'

export async function POST(
  req: NextRequest,
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
  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return apiError('Submission not found', 404)

  if (submission.status !== 'in_progress') return apiError('Submission already finalized', 409)

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) return apiError('No audio file provided', 400)

  const storagePath = responseRecordingPath(
    session.registrationId,
    submission.assignmentId,
    submission.id
  )

  const transcript = await transcribeAudio(audioFile)

  await Promise.all([
    updateTranscript(submission.id, transcript),
    updateRecordingUrl(submission.id, storagePath),
  ])

  return NextResponse.json({ transcript })
}
