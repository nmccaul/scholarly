import { createServiceClient } from '@/lib/supabase/client'
import type {
  AssignmentId,
  AiGradeRationale,
  CheckpointConversationTurn,
  CheckpointStatus,
  GradeSyncStatus,
  ReadingCheckpoint,
  SubmissionId,
  SubmissionStatus,
  UserId,
} from '@/types/domain'

// ─── Type helpers ─────────────────────────────────────────────────────────────

type RawConversation = Array<{ role: string; text: string }>
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

function rowToCheckpoint(row: {
  id: string
  submission_id: string
  section_index: number
  conversation: RawConversation
  status: string
  started_at: string | null
  passed_at: string | null
  follow_up_count: number
  ai_feedback: string | null
}): ReadingCheckpoint {
  return {
    id: row.id,
    submissionId: row.submission_id as SubmissionId,
    sectionIndex: row.section_index,
    conversation: row.conversation.map((t) => ({
      role: t.role as 'student' | 'ai',
      text: t.text,
    })),
    status: row.status as CheckpointStatus,
    startedAt: row.started_at,
    passedAt: row.passed_at,
    followUpCount: row.follow_up_count,
    aiFeedback: row.ai_feedback,
  }
}

// ─── Submission init ──────────────────────────────────────────────────────────

export async function findOrCreateReadingSubmission(
  assignmentId: AssignmentId,
  studentId: UserId,
  sectionCount: number
): Promise<{ submissionId: SubmissionId; alreadySubmitted: boolean; currentSectionIndex: number }> {
  const db = createServiceClient()

  const { data: existing, error: lookupError } = await db
    .from('submissions')
    .select('id, status, reading_assessment_submissions(current_section_index)')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .single()

  if (lookupError && lookupError.code !== 'PGRST116') {
    throw new Error(`Failed to look up submission: ${lookupError.message}`)
  }

  if (existing) {
    const row = existing as unknown as {
      id: string
      status: string
      reading_assessment_submissions: { current_section_index: number } | null
    }
    return {
      submissionId: row.id as SubmissionId,
      alreadySubmitted: row.status === 'submitted' || row.status === 'graded',
      currentSectionIndex: row.reading_assessment_submissions?.current_section_index ?? 0,
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

  const { error: readingError } = await db
    .from('reading_assessment_submissions')
    .insert({ submission_id: submissionId })

  if (readingError) {
    throw new Error(`Failed to create reading submission: ${readingError.message}`)
  }

  // Create all checkpoints in 'locked' state upfront
  const checkpointRows = Array.from({ length: sectionCount }, (_, i) => ({
    submission_id: submissionId,
    section_index: i,
    status: 'locked' as const,
  }))

  const { error: cpError } = await db.from('reading_checkpoints').insert(checkpointRows)
  if (cpError) {
    throw new Error(`Failed to create reading checkpoints: ${cpError.message}`)
  }

  return { submissionId, alreadySubmitted: false, currentSectionIndex: 0 }
}

// ─── Checkpoint reads ─────────────────────────────────────────────────────────

export async function getCheckpoint(
  submissionId: SubmissionId,
  sectionIndex: number
): Promise<ReadingCheckpoint | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('reading_checkpoints')
    .select('id, submission_id, section_index, conversation, status, started_at, passed_at, follow_up_count, ai_feedback')
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)
    .single()

  if (error || !data) return null
  return rowToCheckpoint(data as Parameters<typeof rowToCheckpoint>[0])
}

export async function getAllCheckpoints(submissionId: SubmissionId): Promise<ReadingCheckpoint[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('reading_checkpoints')
    .select('id, submission_id, section_index, conversation, status, started_at, passed_at, follow_up_count, ai_feedback')
    .eq('submission_id', submissionId)
    .order('section_index', { ascending: true })

  if (error) throw new Error(`Failed to fetch checkpoints: ${error.message}`)
  return (data ?? []).map((row) => rowToCheckpoint(row as Parameters<typeof rowToCheckpoint>[0]))
}

// ─── Checkpoint writes — text mode ────────────────────────────────────────────

export async function saveInitialTextResponse(
  submissionId: SubmissionId,
  sectionIndex: number,
  text: string
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('reading_checkpoints')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      conversation: [{ role: 'student', text }],
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to save initial text response: ${error.message}`)
}

export async function appendAiFollowUpQuestion(
  submissionId: SubmissionId,
  sectionIndex: number,
  question: string
): Promise<void> {
  const db = createServiceClient()

  const cp = await getCheckpoint(submissionId, sectionIndex)
  if (!cp) throw new Error(`Checkpoint not found: section ${sectionIndex}`)

  const { error } = await db
    .from('reading_checkpoints')
    .update({
      conversation: [...cp.conversation, { role: 'ai', text: question }],
      follow_up_count: cp.followUpCount + 1,
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to append AI follow-up: ${error.message}`)
}

export async function appendStudentFollowUpAnswer(
  submissionId: SubmissionId,
  sectionIndex: number,
  answer: string
): Promise<void> {
  const db = createServiceClient()

  const cp = await getCheckpoint(submissionId, sectionIndex)
  if (!cp) throw new Error(`Checkpoint not found: section ${sectionIndex}`)

  const { error } = await db
    .from('reading_checkpoints')
    .update({
      conversation: [...cp.conversation, { role: 'student', text: answer }],
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to append student follow-up answer: ${error.message}`)
}

export async function markCheckpointPassed(
  submissionId: SubmissionId,
  sectionIndex: number,
  aiFeedback: string
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('reading_checkpoints')
    .update({
      status: 'passed',
      passed_at: new Date().toISOString(),
      ai_feedback: aiFeedback,
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to mark checkpoint passed: ${error.message}`)
}

export async function markCheckpointForceUnlocked(
  submissionId: SubmissionId,
  sectionIndex: number,
  aiFeedback: string
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('reading_checkpoints')
    .update({
      status: 'force_unlocked',
      ai_feedback: aiFeedback,
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to mark checkpoint force-unlocked: ${error.message}`)
}

export async function advanceSectionIndex(
  submissionId: SubmissionId,
  newIndex: number
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('reading_assessment_submissions')
    .update({ current_section_index: newIndex })
    .eq('submission_id', submissionId)

  if (error) throw new Error(`Failed to advance section index: ${error.message}`)
}

// ─── Checkpoint writes — voice mode ──────────────────────────────────────────

export async function saveVoiceConversation(
  submissionId: SubmissionId,
  sectionIndex: number,
  params: {
    conversation: CheckpointConversationTurn[]
    passed: boolean
    aiFeedback: string
  }
): Promise<void> {
  const db = createServiceClient()
  const now = new Date().toISOString()

  const { error } = await db
    .from('reading_checkpoints')
    .update({
      conversation: params.conversation,
      status: params.passed ? 'passed' : 'force_unlocked',
      started_at: now,
      ...(params.passed ? { passed_at: now } : {}),
      ai_feedback: params.aiFeedback,
    })
    .eq('submission_id', submissionId)
    .eq('section_index', sectionIndex)

  if (error) throw new Error(`Failed to save voice conversation: ${error.message}`)
}

// ─── Final grading ────────────────────────────────────────────────────────────

export async function saveReadingGrade(
  submissionId: SubmissionId,
  aiGrade: number,
  rationale: AiGradeRationale,
  finalGrade: number
): Promise<void> {
  const db = createServiceClient()

  const { error: gradeError } = await db
    .from('reading_assessment_submissions')
    .update({
      ai_grade: aiGrade,
      ai_grade_rationale: {
        criteria_scores: rationale.criteriaScores.map((s) => ({
          label: s.label,
          score: s.score,
          rationale: s.rationale,
        })),
        overall_feedback: rationale.overallFeedback,
      },
      final_grade: finalGrade,
      graded_at: new Date().toISOString(),
    })
    .eq('submission_id', submissionId)

  if (gradeError) throw new Error(`Failed to save reading grade: ${gradeError.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', submissionId)

  if (subError) throw new Error(`Failed to update submission status after grading: ${subError.message}`)
}

// ─── Teacher dashboard ────────────────────────────────────────────────────────

export interface ReadingSubmissionListRow {
  submissionId: SubmissionId
  studentName: string | null
  studentEmail: string | null
  submittedAt: string | null
  status: SubmissionStatus
  aiGrade: number | null
  finalGrade: number | null
  syncStatus: GradeSyncStatus | null
  passedCheckpoints: number
  totalCheckpoints: number
}

export async function listReadingSubmissionsForAssignment(
  assignmentId: AssignmentId
): Promise<ReadingSubmissionListRow[]> {
  const db = createServiceClient()

  const { data: rows, error } = await db
    .from('submissions')
    .select(
      'id, status, submitted_at, users!student_id(name, email), reading_assessment_submissions(ai_grade, final_grade)'
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(`Failed to list reading submissions: ${error.message}`)

  const allRows = (rows ?? []) as unknown as Array<{
    id: string
    status: string
    submitted_at: string | null
    users: { name: string | null; email: string | null } | null
    reading_assessment_submissions: { ai_grade: number | null; final_grade: number | null } | null
  }>

  const ids = allRows.map((r) => r.id)
  const syncMap: Record<string, GradeSyncStatus> = {}
  const checkpointMap: Record<string, { passed: number; total: number }> = {}

  if (ids.length > 0) {
    const [syncResult, cpResult] = await Promise.all([
      db
        .from('grade_sync_log')
        .select('submission_id, status')
        .in('submission_id', ids)
        .order('synced_at', { ascending: false }),
      db
        .from('reading_checkpoints')
        .select('submission_id, status')
        .in('submission_id', ids),
    ])

    for (const log of syncResult.data ?? []) {
      const l = log as { submission_id: string; status: string }
      if (!syncMap[l.submission_id]) {
        syncMap[l.submission_id] = l.status as GradeSyncStatus
      }
    }

    for (const cp of cpResult.data ?? []) {
      const c = cp as { submission_id: string; status: string }
      const entry = checkpointMap[c.submission_id] ?? { passed: 0, total: 0 }
      entry.total++
      if (c.status === 'passed') entry.passed++
      checkpointMap[c.submission_id] = entry
    }
  }

  return allRows.map((r) => ({
    submissionId: r.id as SubmissionId,
    studentName: r.users?.name ?? null,
    studentEmail: r.users?.email ?? null,
    submittedAt: r.submitted_at,
    status: r.status as SubmissionStatus,
    aiGrade: r.reading_assessment_submissions?.ai_grade ?? null,
    finalGrade: r.reading_assessment_submissions?.final_grade ?? null,
    syncStatus: syncMap[r.id] ?? null,
    passedCheckpoints: checkpointMap[r.id]?.passed ?? 0,
    totalCheckpoints: checkpointMap[r.id]?.total ?? 0,
  }))
}

export interface ReadingTeacherSubmissionDetail {
  submissionId: SubmissionId
  assignmentId: AssignmentId
  studentName: string | null
  studentEmail: string | null
  submittedAt: string | null
  status: SubmissionStatus
  checkpoints: ReadingCheckpoint[]
  aiGrade: number | null
  aiGradeRationale: AiGradeRationale | null
  finalGrade: number | null
  teacherFeedback: string | null
  gradedAt: string | null
  latestSyncStatus: GradeSyncStatus | null
}

export async function getReadingSubmissionAsTeacher(
  submissionId: SubmissionId
): Promise<ReadingTeacherSubmissionDetail | null> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('submissions')
    .select(
      'id, assignment_id, status, submitted_at, users!student_id(name, email), reading_assessment_submissions(ai_grade, ai_grade_rationale, final_grade, teacher_feedback, graded_at)'
    )
    .eq('id', submissionId)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    assignment_id: string
    status: string
    submitted_at: string | null
    users: { name: string | null; email: string | null } | null
    reading_assessment_submissions: {
      ai_grade: number | null
      ai_grade_rationale: RawAiGradeRationale
      final_grade: number | null
      teacher_feedback: string | null
      graded_at: string | null
    } | null
  }

  const [checkpoints, syncData] = await Promise.all([
    getAllCheckpoints(submissionId),
    db
      .from('grade_sync_log')
      .select('status')
      .eq('submission_id', submissionId)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const reading = row.reading_assessment_submissions

  return {
    submissionId: row.id as SubmissionId,
    assignmentId: row.assignment_id as AssignmentId,
    studentName: row.users?.name ?? null,
    studentEmail: row.users?.email ?? null,
    submittedAt: row.submitted_at,
    status: row.status as SubmissionStatus,
    checkpoints,
    aiGrade: reading?.ai_grade ?? null,
    aiGradeRationale: toAiGradeRationale(reading?.ai_grade_rationale ?? null),
    finalGrade: reading?.final_grade ?? null,
    teacherFeedback: reading?.teacher_feedback ?? null,
    gradedAt: reading?.graded_at ?? null,
    latestSyncStatus: syncData.data
      ? ((syncData.data as { status: string }).status as GradeSyncStatus)
      : null,
  }
}

export async function overrideReadingGrade(params: {
  submissionId: SubmissionId
  finalGrade: number
  teacherFeedback: string | null
  gradedBy: UserId
}): Promise<void> {
  const db = createServiceClient()

  const { error } = await db
    .from('reading_assessment_submissions')
    .update({
      final_grade: params.finalGrade,
      teacher_feedback: params.teacherFeedback,
      graded_by: params.gradedBy,
      graded_at: new Date().toISOString(),
    })
    .eq('submission_id', params.submissionId)

  if (error) throw new Error(`Failed to override reading grade: ${error.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', params.submissionId)

  if (subError) throw new Error(`Failed to update submission status after override: ${subError.message}`)
}

export async function resetReadingSubmission(submissionId: SubmissionId): Promise<void> {
  const db = createServiceClient()

  const { error: cpError } = await db
    .from('reading_checkpoints')
    .update({
      status: 'locked',
      conversation: [],
      started_at: null,
      passed_at: null,
      follow_up_count: 0,
      ai_feedback: null,
    })
    .eq('submission_id', submissionId)

  if (cpError) throw new Error(`Failed to reset checkpoints: ${cpError.message}`)

  const { error: readingError } = await db
    .from('reading_assessment_submissions')
    .update({
      current_section_index: 0,
      ai_grade: null,
      ai_grade_rationale: null,
      final_grade: null,
      teacher_feedback: null,
      graded_at: null,
    })
    .eq('submission_id', submissionId)

  if (readingError) throw new Error(`Failed to reset reading submission: ${readingError.message}`)

  const { error: subError } = await db
    .from('submissions')
    .update({ status: 'in_progress', submitted_at: null })
    .eq('id', submissionId)
    .in('status', ['submitted', 'graded', 'error'])

  if (subError) throw new Error(`Failed to reset submission status: ${subError.message}`)
}
