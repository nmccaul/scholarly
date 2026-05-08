import { NextRequest, NextResponse } from 'next/server'
import { requireSession, SessionError } from '@/lib/lti/session'
import { getSubmission, markSubmitted, saveGrade } from '@/lib/submissions/repository'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { getMaterialsByIds, listAssignmentMaterials } from '@/lib/materials/repository'
import { findRegistrationById } from '@/lib/lti/registrations'
import { gradeSubmission } from '@/lib/ai/grade'
import { syncGradeToCanvas } from '@/lib/lti/grade-sync'
import type { AiGradeRationale, SubmissionId } from '@/types/domain'
import type { SubmitRequest, SubmitResponse } from '@/types/api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    throw e
  }

  let body: SubmitRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const { id } = await params
  const submission = await getSubmission(id as SubmissionId, session.userId)
  if (!submission) return err('Submission not found', 404)

  const assignment = await findAssignmentWithConfig(submission.assignmentId)
  if (!assignment) return err('Assignment not found', 500)

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
    return err('Submission is already being processed', 409)
  }

  await markSubmitted(submission.id)

  let aiGrade: number | null = null
  let aiGradeRationale: AiGradeRationale | null = null
  let finalGrade: number | null = null

  if (assignment.config.aiGradingEnabled) {
    const [libraryMaterials, assignmentMaterials] = await Promise.all([
      getMaterialsByIds(assignment.config.selectedMaterialIds, assignment.courseId),
      listAssignmentMaterials(assignment.id),
    ])
    const contextMaterials = [...libraryMaterials, ...assignmentMaterials]

    // Use server-side transcript and exchanges — never trust client-supplied grades input
    const result = await gradeSubmission({
      assignmentPrompt: assignment.config.prompt,
      rubric: assignment.config.rubric,
      transcript: body.transcript || submission.transcript || '',
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

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
