import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, updateFollowUpAnswer } from '@/lib/submissions/repository'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionIndex: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    throw e
  }

  const { id, questionIndex: qiStr } = await params
  const questionIndex = parseInt(qiStr, 10)
  if (isNaN(questionIndex) || questionIndex < 0) return apiError('Invalid question index', 400)

  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return apiError('Submission not found', 404)

  if (submission.status !== 'in_progress') return apiError('Submission already finalized', 409)

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) return apiError('No audio file provided', 400)

  const answerTranscript = await transcribeAudio(audioFile)

  await updateFollowUpAnswer(submission.id, questionIndex, answerTranscript)

  return NextResponse.json({ answerTranscript })
}
