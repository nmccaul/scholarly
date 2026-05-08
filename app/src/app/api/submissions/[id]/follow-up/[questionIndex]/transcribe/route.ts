import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, updateFollowUpAnswer } from '@/lib/submissions/repository'
import { downloadRecording, followUpRecordingPath } from '@/lib/storage/recordings'
import { transcribeAudio } from '@/lib/ai/transcribe'
import type { SubmissionId } from '@/types/domain'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionIndex: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    throw e
  }

  const { id, questionIndex: qiStr } = await params
  const questionIndex = parseInt(qiStr, 10)
  if (isNaN(questionIndex) || questionIndex < 0) return err('Invalid question index', 400)

  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return err('Submission not found', 404)

  if (submission.status !== 'in_progress') return err('Submission already finalized', 409)

  const storagePath = followUpRecordingPath(
    session.registrationId,
    submission.assignmentId,
    submission.id,
    questionIndex
  )

  const blob = await downloadRecording(storagePath)
  const answerTranscript = await transcribeAudio(blob)

  await updateFollowUpAnswer(submission.id, questionIndex, answerTranscript)

  return NextResponse.json({ answerTranscript })
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
