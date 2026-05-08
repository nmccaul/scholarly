import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, updateTranscript, updateRecordingUrl } from '@/lib/submissions/repository'
import { downloadRecording, responseRecordingPath } from '@/lib/storage/recordings'
import { transcribeAudio } from '@/lib/ai/transcribe'
import type { SubmissionId } from '@/types/domain'

export async function POST(
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
  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return err('Submission not found', 404)

  if (submission.status !== 'in_progress') return err('Submission already finalized', 409)

  const storagePath = responseRecordingPath(
    session.registrationId,
    submission.assignmentId,
    submission.id
  )

  const blob = await downloadRecording(storagePath)
  const transcript = await transcribeAudio(blob)

  await Promise.all([
    updateTranscript(submission.id, transcript),
    updateRecordingUrl(submission.id, storagePath),
  ])

  return NextResponse.json({ transcript })
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
