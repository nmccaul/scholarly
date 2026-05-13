import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission } from '@/lib/submissions/repository'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import {
  getCheckpoint,
  saveVoiceConversation,
  advanceSectionIndex,
} from '@/lib/reading/repository'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'
import type { CompleteCheckpointRequest, CompleteCheckpointResponse } from '@/types/api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionIndex: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    throw e
  }

  const { id, sectionIndex: sectionIndexStr } = await params
  const sectionIndex = parseInt(sectionIndexStr, 10)
  if (!Number.isFinite(sectionIndex) || sectionIndex < 0) return apiError('Invalid sectionIndex', 400)

  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return apiError('Submission not found', 404)
  if (submission.status !== 'in_progress') return apiError('Submission is not in progress', 409)

  const assignment = await findReadingAssignmentWithConfig(submission.assignmentId)
  if (!assignment) return apiError('Assignment not found', 500)

  const { sections } = assignment.config
  if (sectionIndex >= sections.length) return apiError('Section index out of range', 400)

  const checkpoint = await getCheckpoint(id as SubmissionId, sectionIndex)
  if (!checkpoint) return apiError('Checkpoint not found', 404)
  if (checkpoint.status === 'passed' || checkpoint.status === 'force_unlocked') {
    return apiError('Checkpoint already completed', 409)
  }

  let body: CompleteCheckpointRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!Array.isArray(body.conversation)) {
    return apiError('conversation must be an array', 400)
  }
  if (typeof body.passed !== 'boolean') {
    return apiError('passed must be a boolean', 400)
  }
  if (typeof body.aiFeedback !== 'string') {
    return apiError('aiFeedback must be a string', 400)
  }

  await saveVoiceConversation(id as SubmissionId, sectionIndex, {
    conversation: body.conversation,
    passed: body.passed,
    aiFeedback: body.aiFeedback,
  })

  const newSectionIndex = sectionIndex + 1
  await advanceSectionIndex(id as SubmissionId, newSectionIndex)

  const response: CompleteCheckpointResponse = {
    nextSectionUnlocked: newSectionIndex < sections.length,
    newSectionIndex,
    totalSections: sections.length,
  }
  return NextResponse.json(response)
}
