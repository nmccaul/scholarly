import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, setSubmissionStatus } from '@/lib/submissions/repository'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { findRegistrationById } from '@/lib/lti/registrations'
import { getAllCheckpoints, saveReadingGrade } from '@/lib/reading/repository'
import { gradeReadingSubmission } from '@/lib/ai/checkpoint'
import { syncGradeToCanvas } from '@/lib/lti/grade-sync'
import { apiError } from '@/lib/api/response'
import type { AiGradeRationale, SubmissionId } from '@/types/domain'
import type { SubmitResponse } from '@/types/api'

export async function POST(
  _req: NextRequest,
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

  const assignment = await findReadingAssignmentWithConfig(submission.assignmentId)
  if (!assignment) return apiError('Assignment not found', 500)

  // Idempotent: return cached result if already graded
  if (submission.status === 'graded') {
    const response: SubmitResponse = {
      aiGrade: submission.aiGrade,
      aiGradeRationale: submission.aiGradeRationale,
      finalGrade: submission.finalGrade,
      pointsPossible: assignment.pointsPossible,
      syncStatus: null,
    }
    return NextResponse.json(response)
  }

  if (submission.status === 'submitted') {
    return apiError('Submission is already being processed', 409)
  }

  const checkpoints = await getAllCheckpoints(id as SubmissionId)
  const allResolved = checkpoints.every(
    (cp) => cp.status === 'passed' || cp.status === 'force_unlocked'
  )
  if (!allResolved) {
    return apiError('Not all checkpoints are completed', 409)
  }

  await setSubmissionStatus(id as SubmissionId, 'submitted')

  let aiGrade: number | null = null
  let aiGradeRationale: AiGradeRationale | null = null
  let finalGrade: number | null = null

  try {
    if (assignment.config.aiGradingEnabled) {
      const result = await gradeReadingSubmission({
        sections: assignment.config.sections,
        checkpoints: checkpoints.map((cp) => ({
          sectionIndex: cp.sectionIndex,
          conversation: cp.conversation,
          status: cp.status,
        })),
        rubric: assignment.config.rubric,
      })
      aiGrade = result.aiGrade
      aiGradeRationale = result.rationale
      finalGrade = result.aiGrade
    }

    await saveReadingGrade(
      id as SubmissionId,
      aiGrade ?? 0,
      aiGradeRationale ?? { criteriaScores: [], overallFeedback: '' },
      finalGrade ?? 0
    )
  } catch (e) {
    await setSubmissionStatus(id as SubmissionId, 'error').catch(() => {})
    console.error('[reading-submit] Grading failed, submission reset to error:', e)
    return apiError('Grading failed. Please try again.', 500)
  }

  let syncStatus: 'success' | 'failed' | null = null
  if (finalGrade !== null && assignment.ltiLineitemUrl) {
    const registration = await findRegistrationById(session.registrationId)
    if (registration) {
      syncStatus = await syncGradeToCanvas({
        registration,
        lineitemUrl: assignment.ltiLineitemUrl,
        ltiSub: session.ltiSub,
        scoreGiven: finalGrade,
        scoreMaximum: assignment.pointsPossible,
        submissionId: id as SubmissionId,
      })
    }
  }

  const response: SubmitResponse = {
    aiGrade,
    aiGradeRationale,
    finalGrade,
    pointsPossible: assignment.pointsPossible,
    syncStatus,
  }
  return NextResponse.json(response)
}
