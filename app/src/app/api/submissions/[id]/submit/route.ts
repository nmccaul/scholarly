import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, markSubmitted, saveGrade, setSubmissionStatus } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { getMaterialsByIds, listAssignmentMaterials } from '@/lib/materials/repository'
import { findRegistrationById } from '@/lib/lti/registrations'
import { gradeSubmission } from '@/lib/ai/grade'
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

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
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

  // Reject retries while grading is in flight (status = 'submitted')
  if (submission.status === 'submitted') {
    return apiError('Submission is already being processed', 409)
  }

  await markSubmitted(submission.id)

  let aiGrade: number | null = null
  let aiGradeRationale: AiGradeRationale | null = null
  let finalGrade: number | null = null

  try {
    if (assignment.config.aiGradingEnabled) {
      const [libraryMaterials, assignmentMaterials] = await Promise.all([
        getMaterialsByIds(assignment.config.selectedMaterialIds, assignment.courseId),
        listAssignmentMaterials(assignment.id),
      ])
      const contextMaterials = [...libraryMaterials, ...assignmentMaterials]

      // Use server-side transcript and exchanges; never trust client-supplied grading input.
      const result = await gradeSubmission({
        assignmentPrompt: assignment.config.prompt,
        rubric: assignment.config.rubric,
        transcript: submission.transcript || '',
        followUpExchanges: submission.followUpExchanges.map((e) => ({
          question: e.question,
          answerTranscript: e.answerTranscript,
        })),
        contextMaterials: contextMaterials.length > 0 ? contextMaterials : undefined,
      })
      aiGrade = result.aiGrade
      aiGradeRationale = result.rationale
      finalGrade = result.aiGrade
    }

    await saveGrade(submission.id, aiGrade, aiGradeRationale, finalGrade)
  } catch (e) {
    // Reset status so the student can retry rather than being permanently stuck.
    await setSubmissionStatus(submission.id, 'error').catch(() => {})
    console.error('[submit] Grading failed, submission reset to error:', e)
    return apiError('Grading failed. Please try again.', 500)
  }

  // AGS passback — best-effort, never fails the response
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
        submissionId: submission.id as SubmissionId,
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
