import { submitGradeToCanvas } from './ags'
import { createServiceClient } from '@/lib/supabase/client'
import type { LtiRegistration, SubmissionId } from '@/types/domain'

const MAX_ATTEMPTS = 3

export async function syncGradeToCanvas(params: {
  registration: LtiRegistration
  lineitemUrl: string
  ltiSub: string
  scoreGiven: number
  scoreMaximum: number
  submissionId: SubmissionId
}): Promise<'success' | 'failed'> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(2 ** (attempt - 1) * 1000) // 2s then 4s between retries
    }
    try {
      const canvasResponse = await submitGradeToCanvas({
        registration: params.registration,
        lineitemUrl: params.lineitemUrl,
        ltiSub: params.ltiSub,
        scoreGiven: params.scoreGiven,
        scoreMaximum: params.scoreMaximum,
      })
      await logSync(params.submissionId, params.scoreGiven, 'success', canvasResponse, attempt)
      return 'success'
    } catch (e) {
      lastError = e
    }
  }

  await logSync(
    params.submissionId,
    params.scoreGiven,
    'failed',
    { error: String(lastError) },
    MAX_ATTEMPTS
  )
  return 'failed'
}

async function logSync(
  submissionId: SubmissionId,
  score: number,
  status: 'success' | 'failed',
  canvasResponse: unknown,
  attempt: number
): Promise<void> {
  const db = createServiceClient()
  await db.from('grade_sync_log').insert({
    submission_id: submissionId,
    score,
    status,
    canvas_response: canvasResponse,
    attempt,
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
