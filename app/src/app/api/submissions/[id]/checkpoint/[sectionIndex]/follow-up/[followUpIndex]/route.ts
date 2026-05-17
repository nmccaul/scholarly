import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission } from '@/lib/submissions/repository'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import {
  getCheckpoint,
  appendStudentFollowUpAnswer,
  appendAiFollowUpQuestion,
  markCheckpointPassed,
  markCheckpointForceUnlocked,
  advanceSectionIndex,
} from '@/lib/reading/repository'
import { evaluateCheckpointResponse } from '@/lib/ai/checkpoint'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'
import type { CheckpointEvaluationResponse } from '@/types/api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionIndex: string; followUpIndex: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    throw e
  }

  const { id, sectionIndex: sectionIndexStr, followUpIndex: followUpIndexStr } = await params
  const sectionIndex = parseInt(sectionIndexStr, 10)
  const followUpIndex = parseInt(followUpIndexStr, 10)

  if (!Number.isFinite(sectionIndex) || sectionIndex < 0) return apiError('Invalid sectionIndex', 400)
  if (!Number.isFinite(followUpIndex) || followUpIndex < 0) return apiError('Invalid followUpIndex', 400)

  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return apiError('Submission not found', 404)
  if (submission.status !== 'in_progress') return apiError('Submission is not in progress', 409)

  const assignment = await findReadingAssignmentWithConfig(submission.assignmentId)
  if (!assignment) return apiError('Assignment not found', 500)

  const { sections, maxFollowUps } = assignment.config
  if (sectionIndex >= sections.length) return apiError('Section index out of range', 400)

  const checkpoint = await getCheckpoint(id as SubmissionId, sectionIndex)
  if (!checkpoint) return apiError('Checkpoint not found', 404)
  if (checkpoint.status === 'passed' || checkpoint.status === 'force_unlocked') {
    return apiError('Checkpoint already completed', 409)
  }

  // Validate that followUpIndex matches expected state (server-authoritative)
  if (checkpoint.followUpCount !== followUpIndex) {
    return apiError('Follow-up index mismatch', 409)
  }

  let body: { text: string }
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.text || typeof body.text !== 'string' || body.text.trim().length < 10) {
    return apiError('Response must be at least 10 characters', 400)
  }

  const section = sections[sectionIndex]!

  await appendStudentFollowUpAnswer(id as SubmissionId, sectionIndex, body.text.trim())

  // Re-read checkpoint to get full conversation including the answer we just appended
  const updatedCheckpoint = await getCheckpoint(id as SubmissionId, sectionIndex)
  if (!updatedCheckpoint) return apiError('Checkpoint not found after update', 500)

  const evaluation = await evaluateCheckpointResponse({
    sectionTitle: section.title,
    sectionContent: section.content,
    conversation: updatedCheckpoint.conversation,
    checkpointPassMode: assignment.config.checkpointPassMode,
    checkpointActions: assignment.config.checkpointActions,
  })

  const nextFollowUpIndex = followUpIndex + 1
  const followUpsRemaining = nextFollowUpIndex < maxFollowUps

  if (evaluation.passed) {
    await markCheckpointPassed(id as SubmissionId, sectionIndex, evaluation.feedbackMessage)
    await advanceSectionIndex(id as SubmissionId, sectionIndex + 1)

    const response: CheckpointEvaluationResponse = {
      passed: true,
      forceUnlocked: false,
      feedbackMessage: evaluation.feedbackMessage,
      nextQuestion: null,
      followUpIndex: null,
    }
    return NextResponse.json(response)
  }

  if (followUpsRemaining && evaluation.followUpQuestion) {
    await appendAiFollowUpQuestion(id as SubmissionId, sectionIndex, evaluation.followUpQuestion)

    const response: CheckpointEvaluationResponse = {
      passed: false,
      forceUnlocked: false,
      feedbackMessage: evaluation.feedbackMessage,
      nextQuestion: evaluation.followUpQuestion,
      followUpIndex: nextFollowUpIndex,
    }
    return NextResponse.json(response)
  }

  // Max follow-ups exhausted — force-unlock
  await markCheckpointForceUnlocked(id as SubmissionId, sectionIndex, evaluation.feedbackMessage)
  await advanceSectionIndex(id as SubmissionId, sectionIndex + 1)

  const response: CheckpointEvaluationResponse = {
    passed: false,
    forceUnlocked: true,
    feedbackMessage: evaluation.feedbackMessage,
    nextQuestion: null,
    followUpIndex: null,
  }
  return NextResponse.json(response)
}
