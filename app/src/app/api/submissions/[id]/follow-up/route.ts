import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, appendFollowUp } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { createSignedUploadUrl, followUpRecordingPath } from '@/lib/storage/recordings'
import { generateFollowUpQuestion } from '@/lib/ai/follow-up'
import type { SubmissionId } from '@/types/domain'
import type { GenerateFollowUpResponse } from '@/types/api'

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
  if (!submission.transcript) return err('Transcript not yet available', 400)

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
  if (!assignment || assignment.courseId !== session.courseId) return err('Assignment not found', 500)

  const priorExchanges = submission.followUpExchanges
    .filter((e) => e.answerTranscript)
    .map((e) => ({ question: e.question, answerTranscript: e.answerTranscript }))

  const question = await generateFollowUpQuestion(
    assignment.config.prompt,
    submission.transcript,
    priorExchanges
  )

  // Derive index from DB state — never trust client-supplied index for storage path
  const questionIndex = submission.followUpExchanges.length
  await appendFollowUp(submission.id, question)

  const storagePath = followUpRecordingPath(
    session.registrationId,
    submission.assignmentId,
    submission.id,
    questionIndex
  )
  const uploadUrl = await createSignedUploadUrl(storagePath)

  const response: GenerateFollowUpResponse = { question, questionIndex, uploadUrl }
  return NextResponse.json(response)
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
