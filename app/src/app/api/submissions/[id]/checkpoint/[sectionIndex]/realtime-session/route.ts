import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission } from '@/lib/submissions/repository'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { getCheckpoint } from '@/lib/reading/repository'
import { getOpenAIClient } from '@/lib/ai/client'
import { apiError } from '@/lib/api/response'
import type { SubmissionId } from '@/types/domain'
import type { RealtimeSessionResponse } from '@/types/api'

export async function POST(
  _req: NextRequest,
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
  if (assignment.config.checkpointType !== 'voice') return apiError('Not a voice checkpoint assignment', 400)

  if (sectionIndex >= assignment.config.sections.length) return apiError('Section index out of range', 400)

  const checkpoint = await getCheckpoint(id as SubmissionId, sectionIndex)
  if (!checkpoint) return apiError('Checkpoint not found', 404)
  if (checkpoint.status === 'passed' || checkpoint.status === 'force_unlocked') {
    return apiError('Checkpoint already completed', 409)
  }

  const client = getOpenAIClient()

  // Mint an ephemeral client secret. Tools and instructions are configured client-side
  // by the @openai/agents SDK via update_session after connect().
  // Response shape: { expires_at, session, value } — value is the ek_... token.
  const realtimeResponse = await client.realtime.clientSecrets.create({
    session: {
      type: 'realtime',
      model: 'gpt-4o-realtime-preview',
    },
  })

  const response: RealtimeSessionResponse = { clientSecret: realtimeResponse.value }
  return NextResponse.json(response)
}
