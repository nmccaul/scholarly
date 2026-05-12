import { createServiceClient } from '@/lib/supabase/client'
import type {
  AssignmentId,
  AiGradeRationale,
  GradeSyncStatus,
  SubmissionId,
  SubmissionStatus,
  UserId,
} from '@/types/domain'

export interface SubmissionData {
  id: SubmissionId
  assignmentId: AssignmentId
  studentId: UserId
  status: SubmissionStatus
  submittedAt: string | null
  recordingUrl: string | null
  transcript: string | null
  followUpExchanges: Array<{
    question: string
    answerTranscript: string
    answerRecordingUrl: string | null
  }>
  aiGrade: number | null
  aiGradeRationale: AiGradeRationale | null
  finalGrade: number | null
}

type FollowUpExchangeRow = {
  question: string
  answer_transcript: string
  answer_recording_url: string | null
}

type RawAiGradeRationale = {
  criteria_scores: Array<{ label: string; score: number; rationale: string }>
  overall_feedback: string
} | null

function toAiGradeRationale(raw: RawAiGradeRationale): AiGradeRationale | null {
  if (!raw) return null
  return {
    criteriaScores: raw.criteria_scores.map((s) => ({
      label: s.label,
      score: s.score,
      rationale: s.rationale,
    })),
    overallFeedback: raw.overall_feedback,
  }
}

async function fetchFollowUpExchanges(
  submissionId: SubmissionId,
  db: ReturnType<typeof createServiceClient>
): Promise<FollowUpExchangeRow[]> {
  const { data, error } = await db
    .from('oral_assessment_submissions')
    .select('follow_up_exchanges')
    .eq('submission_id', submissionId)
    .single()
  if (error) throw new Error(`Failed to fetch follow-up exchanges: ${error.message}`)
  return (
    (data as { follow_up_exchanges: FollowUpExchangeRow[] | null } | null)
      ?.follow_up_exchanges ?? []
  )
}

export async function findOrCreateSubmission(
  assignmentId: AssignmentId,
  studentId: UserId
): Promise<{ submissionId: SubmissionId; alreadySubmitted: boolean }> {
  const db = createServiceClient()

  const { data: existing, error: lookupError } = await db
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .single()

  // PGRST116 = "no rows found" — any other error is a real DB failure
  if (lookupError && lookupError.code !== 'PGRST116') {
    throw new Error(`Failed to look up submission: ${lookupError.message}`)
  }

  if (existing) {
    const row = existing as { id: string; status: string }
    return {
      submissionId: row.id as SubmissionId,
      alreadySubmitted: row.status === 'submitted' || row.status === 'graded',
    }
  }

  const { data: submission, error: subError } = await db
    .from('submissions')
    .insert({ assignment_id: assignmentId, student_id: studentId })
    .select('id')
    .single()

  if (subError || !submission) {
    throw new Error(`Failed to create submission: ${subError?.message}`)
  }

  const submissionId = (submission as { id: string }).id as SubmissionId

  const { error: oralError } = await db
    .from('oral_assessment_submissions')
    .insert({ submission_id: submissionId })

  if (oralError) {
    throw new Error(`Failed to create oral assessment submission: ${oralError.message}`)
  }

  return { submissionId, alreadySubmitted: false }
}

export async function getSubmission(
  submissionId: SubmissionId,
  studentId: UserId
): Promise<SubmissionData | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('submissions')
    .select(
      'id, assignment_id, student_id, status, submitted_at, oral_assessment_submissions(recording_url, transcript, follow_up_exchanges, ai_grade, ai_grade_rationale, final_grade)'
    )
    .eq('id', submissionId)
    .eq('student_id', studentId)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    assignment_id: string
    student_id: string
    status: string
    submitted_at: string | null
    oral_assessment_submissions: {
      recording_url: string | null
      transcript: string | null
      follow_up_exchanges: FollowUpExchangeRow[] | null
      ai_grade: number | null
      ai_grade_rationale: {
        criteria_scores: Array<{ label: string; score: number; rationale: string }>
        overall_feedback: string
      } | null
      final_grade: number | null
    } | null
  }

  const oral = row.oral_assessment_submissions

  return {
    id: row.id as SubmissionId,
    assignmentId: row.assignment_id as AssignmentId,
    studentId: row.student_id as UserId,
    status: row.status as SubmissionStatus,
    submittedAt: row.submitted_at,
    recordingUrl: oral?.recording_url ?? null,
    transcript: oral?.transcript ?? null,
    followUpExchanges: (oral?.follow_up_exchanges ?? []).map((e) => ({
      question: e.question,
      answerTranscript: e.answer_transcript,
      answerRecordingUrl: e.answer_recording_url,
    })),
    aiGrade: oral?.ai_grade ?? null,
    aiGradeRationale: toAiGradeRationale(oral?.ai_grade_rationale ?? null),
    finalGrade: oral?.final_grade ?? null,
  }
}

export async function updateRecordingUrl(submissionId: SubmissionId, url: string): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('oral_assessment_submissions')
    .update({ recording_url: url })
    .eq('submission_id', submissionId)
  if (error) throw new Error(`Failed to update recording URL: ${error.message}`)
}

export async function updateTranscript(submissionId: SubmissionId, transcript: string): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('oral_assessment_submissions')
    .update({ transcript })
    .eq('submission_id', submissionId)
  if (error) throw new Error(`Failed to update transcript: ${error.message}`)
}

export async function appendFollowUp(submissionId: SubmissionId, question: string): Promise<void> {
  const db = createServiceClient()
  const current = await fetchFollowUpExchanges(submissionId, db)

  const { error } = await db
    .from('oral_assessment_submissions')
    .update({
      follow_up_exchanges: [
        ...current,
        { question, answer_transcript: '', answer_recording_url: null },
      ],
    })
    .eq('submission_id', submissionId)

  if (error) throw new Error(`Failed to append follow-up: ${error.message}`)
}

export async function updateFollowUpAnswer(
  submissionId: SubmissionId,
  index: number,
  answerTranscript: string
): Promise<void> {
  const db = createServiceClient()
  const current = await fetchFollowUpExchanges(submissionId, db)

  if (index >= current.length) {
    throw new Error(`Follow-up index ${index} out of range (length: ${current.length})`)
  }

  const updated = current.map((e, i) =>
    i === index ? { ...e, answer_transcript: answerTranscript } : e
  )

  const { error } = await db
    .from('oral_assessment_submissions')
    .update({ follow_up_exchanges: updated })
    .eq('submission_id', submissionId)

  if (error) throw new Error(`Failed to update follow-up answer: ${error.message}`)
}

export async function markSubmitted(submissionId: SubmissionId): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('submissions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', submissionId)
  if (error) throw new Error(`Failed to mark submission as submitted: ${error.message}`)
}

export async function saveGrade(
  submissionId: SubmissionId,
  aiGrade: number | null,
  aiGradeRationale: AiGradeRationale | null,
  finalGrade: number | null
): Promise<void> {
  const db = createServiceClient()

  const { error: oralError } = await db
    .from('oral_assessment_submissions')
    .update({
      ai_grade: aiGrade,
      ai_grade_rationale: aiGradeRationale
        ? {
            criteria_scores: aiGradeRationale.criteriaScores.map((s) => ({
              label: s.label,
              score: s.score,
              rationale: s.rationale,
            })),
            overall_feedback: aiGradeRationale.overallFeedback,
          }
        : null,
      final_grade: finalGrade,
      graded_at: new Date().toISOString(),
    })
    .eq('submission_id', submissionId)

  if (oralError) throw new Error(`Failed to save grade: ${oralError.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', submissionId)

  if (subError) throw new Error(`Failed to update submission status: ${subError.message}`)
}

// ─── Teacher dashboard ────────────────────────────────────────────────────────

export interface SubmissionListRow {
  submissionId: SubmissionId
  studentName: string | null
  studentEmail: string | null
  submittedAt: string | null
  status: SubmissionStatus
  aiGrade: number | null
  finalGrade: number | null
  syncStatus: GradeSyncStatus | null
}

export async function listSubmissionsForAssignment(
  assignmentId: AssignmentId
): Promise<SubmissionListRow[]> {
  const db = createServiceClient()

  const { data: rows, error } = await db
    .from('submissions')
    .select(
      'id, status, submitted_at, users!student_id(name, email), oral_assessment_submissions(ai_grade, final_grade)'
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(`Failed to list submissions: ${error.message}`)

  const allRows = (rows ?? []) as unknown as Array<{
    id: string
    status: string
    submitted_at: string | null
    users: { name: string | null; email: string | null } | null
    oral_assessment_submissions: { ai_grade: number | null; final_grade: number | null } | null
  }>

  // Batch-fetch latest sync status for all submissions
  const ids = allRows.map((r) => r.id)
  const syncMap: Record<string, GradeSyncStatus> = {}

  if (ids.length > 0) {
    const { data: logs } = await db
      .from('grade_sync_log')
      .select('submission_id, status')
      .in('submission_id', ids)
      .order('synced_at', { ascending: false })

    for (const log of logs ?? []) {
      const l = log as { submission_id: string; status: string }
      if (!syncMap[l.submission_id]) {
        syncMap[l.submission_id] = l.status as GradeSyncStatus
      }
    }
  }

  return allRows.map((r) => ({
    submissionId: r.id as SubmissionId,
    studentName: r.users?.name ?? null,
    studentEmail: r.users?.email ?? null,
    submittedAt: r.submitted_at,
    status: r.status as SubmissionStatus,
    aiGrade: r.oral_assessment_submissions?.ai_grade ?? null,
    finalGrade: r.oral_assessment_submissions?.final_grade ?? null,
    syncStatus: syncMap[r.id] ?? null,
  }))
}

export interface TeacherSubmissionDetail {
  submissionId: SubmissionId
  assignmentId: AssignmentId
  studentName: string | null
  studentEmail: string | null
  studentLtiSub: string | null
  submittedAt: string | null
  status: SubmissionStatus
  recordingStoragePath: string | null
  transcript: string | null
  followUpExchanges: Array<{ question: string; answerTranscript: string }>
  aiGrade: number | null
  aiGradeRationale: AiGradeRationale | null
  finalGrade: number | null
  teacherFeedback: string | null
  gradedAt: string | null
  latestSyncStatus: GradeSyncStatus | null
}

export async function getSubmissionAsTeacher(
  submissionId: SubmissionId
): Promise<TeacherSubmissionDetail | null> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('submissions')
    .select(
      'id, assignment_id, status, submitted_at, users!student_id(name, email, lti_sub), oral_assessment_submissions(recording_url, transcript, follow_up_exchanges, ai_grade, ai_grade_rationale, final_grade, teacher_feedback, graded_at)'
    )
    .eq('id', submissionId)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    assignment_id: string
    status: string
    submitted_at: string | null
    users: { name: string | null; email: string | null; lti_sub: string } | null
    oral_assessment_submissions: {
      recording_url: string | null
      transcript: string | null
      follow_up_exchanges: FollowUpExchangeRow[] | null
      ai_grade: number | null
      ai_grade_rationale: {
        criteria_scores: Array<{ label: string; score: number; rationale: string }>
        overall_feedback: string
      } | null
      final_grade: number | null
      teacher_feedback: string | null
      graded_at: string | null
    } | null
  }

  const oral = row.oral_assessment_submissions

  const { data: syncData } = await db
    .from('grade_sync_log')
    .select('status')
    .eq('submission_id', submissionId)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestSyncStatus = syncData
    ? (syncData as { status: string }).status as GradeSyncStatus
    : null

  return {
    submissionId: row.id as SubmissionId,
    assignmentId: row.assignment_id as AssignmentId,
    studentName: row.users?.name ?? null,
    studentEmail: row.users?.email ?? null,
    studentLtiSub: row.users?.lti_sub ?? null,
    submittedAt: row.submitted_at,
    status: row.status as SubmissionStatus,
    recordingStoragePath: oral?.recording_url ?? null,
    transcript: oral?.transcript ?? null,
    followUpExchanges: (oral?.follow_up_exchanges ?? []).map((e) => ({
      question: e.question,
      answerTranscript: e.answer_transcript,
    })),
    aiGrade: oral?.ai_grade ?? null,
    aiGradeRationale: toAiGradeRationale(oral?.ai_grade_rationale ?? null),
    finalGrade: oral?.final_grade ?? null,
    teacherFeedback: oral?.teacher_feedback ?? null,
    gradedAt: oral?.graded_at ?? null,
    latestSyncStatus,
  }
}

export async function overrideGrade(params: {
  submissionId: SubmissionId
  finalGrade: number
  teacherFeedback: string | null
  gradedBy: UserId
}): Promise<void> {
  const db = createServiceClient()

  const { error } = await db
    .from('oral_assessment_submissions')
    .update({
      final_grade: params.finalGrade,
      teacher_feedback: params.teacherFeedback,
      graded_by: params.gradedBy,
      graded_at: new Date().toISOString(),
    })
    .eq('submission_id', params.submissionId)

  if (error) throw new Error(`Failed to override grade: ${error.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', params.submissionId)

  if (subError) throw new Error(`Failed to update submission status after override: ${subError.message}`)
}

export async function setSubmissionStatus(
  submissionId: SubmissionId,
  status: SubmissionStatus
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('submissions')
    .update({ status })
    .eq('id', submissionId)
  if (error) throw new Error(`Failed to set submission status: ${error.message}`)
}

export async function resetSubmission(submissionId: SubmissionId): Promise<void> {
  const db = createServiceClient()

  const { error: oralError } = await db
    .from('oral_assessment_submissions')
    .update({
      recording_url: null,
      transcript: null,
      follow_up_exchanges: [],
      ai_grade: null,
      ai_grade_rationale: null,
      final_grade: null,
      teacher_feedback: null,
      graded_at: null,
    })
    .eq('submission_id', submissionId)

  if (oralError) throw new Error(`Failed to reset oral submission: ${oralError.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'in_progress', submitted_at: null })
    .eq('id', submissionId)
    .in('status', ['submitted', 'graded', 'error'])

  if (subError) throw new Error(`Failed to reset submission status: ${subError.message}`)
}
