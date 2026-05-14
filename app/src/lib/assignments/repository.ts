import { createServiceClient } from '@/lib/supabase/client'
import type { AssignmentId, AssignmentStatus, AssignmentType, CheckpointType, CourseMaterialId, CourseId, ReadingSection, UserId } from '@/types/domain'
import type { RubricCriterionInput } from '@/types/api'

export interface AssignmentSummary {
  id: AssignmentId
  title: string
  type: AssignmentType
  status: AssignmentStatus
  pointsPossible: number
  createdAt: string
  submissionCount: number
  submittedCount: number
  inProgressCount: number
}

export async function listAssignmentsForCourse(courseId: CourseId): Promise<AssignmentSummary[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('assignments')
    .select('id, title, type, status, points_possible, created_at, submissions(status)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list assignments: ${error.message}`)

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string
      title: string
      type: string
      status: string
      points_possible: number
      created_at: string
      submissions: Array<{ status: string }>
    }
    const subs = r.submissions ?? []
    const submittedCount = subs.filter((s) => s.status === 'submitted' || s.status === 'graded').length
    const inProgressCount = subs.filter((s) => s.status === 'in_progress').length
    return {
      id: r.id as AssignmentId,
      title: r.title,
      type: r.type as AssignmentType,
      status: r.status as AssignmentStatus,
      pointsPossible: r.points_possible,
      createdAt: r.created_at,
      submissionCount: subs.length,
      submittedCount,
      inProgressCount,
    }
  })
}

export interface AssignmentWithConfig {
  id: AssignmentId
  courseId: CourseId
  title: string
  type: 'oral_assessment'
  status: AssignmentStatus
  pointsPossible: number
  ltiLineitemUrl: string | null
  config: {
    prompt: string
    preparationTimeSeconds: number
    maxResponseTimeSeconds: number
    followUpQuestionCount: number
    cameraRequired: boolean
    aiGradingEnabled: boolean
    rubric: Array<{ label: string; description: string; maxPoints: number }>
    selectedMaterialIds: CourseMaterialId[]
  }
}

export async function findAssignmentWithConfig(
  assignmentId: AssignmentId
): Promise<AssignmentWithConfig | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('assignments')
    .select(
      'id, course_id, title, status, points_possible, lti_lineitem_url, oral_assessment_configs(prompt, preparation_time_seconds, max_response_time_seconds, follow_up_question_count, camera_required, ai_grading_enabled, rubric, selected_material_ids)'
    )
    .eq('id', assignmentId)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    course_id: string
    title: string
    status: string
    points_possible: number
    lti_lineitem_url: string | null
    oral_assessment_configs: {
      prompt: string
      preparation_time_seconds: number
      max_response_time_seconds: number
      follow_up_question_count: number
      camera_required: boolean
      ai_grading_enabled: boolean
      rubric: Array<{ label: string; description: string; max_points: number }>
      selected_material_ids: string[]
    } | null
  }

  const config = row.oral_assessment_configs
  if (!config) return null

  return {
    id: row.id as AssignmentId,
    courseId: row.course_id as CourseId,
    title: row.title,
    type: 'oral_assessment' as const,
    status: row.status as AssignmentStatus,
    pointsPossible: row.points_possible,
    ltiLineitemUrl: row.lti_lineitem_url,
    config: {
      prompt: config.prompt,
      preparationTimeSeconds: config.preparation_time_seconds,
      maxResponseTimeSeconds: config.max_response_time_seconds,
      followUpQuestionCount: config.follow_up_question_count,
      cameraRequired: config.camera_required,
      aiGradingEnabled: config.ai_grading_enabled,
      rubric: config.rubric.map((c) => ({
        label: c.label,
        description: c.description,
        maxPoints: c.max_points,
      })),
      selectedMaterialIds: (config.selected_material_ids ?? []) as CourseMaterialId[],
    },
  }
}

export interface UpdateAssignmentParams {
  title: string
  pointsPossible: number
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds?: string[]
}

export async function updateAssignment(
  assignmentId: AssignmentId,
  params: UpdateAssignmentParams
): Promise<void> {
  const db = createServiceClient()

  const { error: assignmentError } = await db
    .from('assignments')
    .update({ title: params.title, points_possible: params.pointsPossible })
    .eq('id', assignmentId)

  if (assignmentError) throw new Error(`Failed to update assignment: ${assignmentError.message}`)

  const { error: configError } = await db
    .from('oral_assessment_configs')
    .update({
      prompt: params.prompt,
      preparation_time_seconds: params.preparationTimeSeconds,
      max_response_time_seconds: params.maxResponseTimeSeconds,
      follow_up_question_count: params.followUpQuestionCount,
      camera_required: params.cameraRequired,
      ai_grading_enabled: params.aiGradingEnabled,
      rubric: params.rubric.map((c) => ({
        label: c.label,
        description: c.description,
        max_points: c.maxPoints,
      })),
      ...(params.selectedMaterialIds !== undefined
        ? { selected_material_ids: params.selectedMaterialIds }
        : {}),
    })
    .eq('assignment_id', assignmentId)

  if (configError) throw new Error(`Failed to update assignment config: ${configError.message}`)
}

export interface CreateAssignmentParams {
  courseId: CourseId
  createdBy: UserId
  title: string
  pointsPossible: number
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds?: string[]
}

export async function getAssignmentCourseId(
  assignmentId: AssignmentId
): Promise<CourseId | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('assignments')
    .select('course_id')
    .eq('id', assignmentId)
    .single()
  if (error || !data) return null
  return (data as unknown as { course_id: string }).course_id as CourseId
}

export async function updateAssignmentLtiFields(
  assignmentId: AssignmentId,
  resourceLinkId: string,
  lineitemUrl: string | null
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db
    .from('assignments')
    .update({
      resource_link_id: resourceLinkId,
      ...(lineitemUrl ? { lti_lineitem_url: lineitemUrl } : {}),
    })
    .eq('id', assignmentId)

  if (error) {
    // Non-fatal — grade passback will fail later but don't block the student launch
    console.error(`[assignments] Failed to update LTI fields for ${assignmentId}:`, error.message)
  }
}

// Two sequential inserts — not wrapped in a DB transaction because Supabase REST doesn't
// support multi-statement transactions. If the config insert fails, the assignment row is
// orphaned but has no config and will never surface to users. Acceptable for now; fix with
// a stored procedure before production launch.
export async function createAssignment(params: CreateAssignmentParams): Promise<AssignmentId> {
  const db = createServiceClient()

  const { data: assignment, error: assignmentError } = await db
    .from('assignments')
    .insert({
      course_id: params.courseId,
      created_by: params.createdBy,
      title: params.title,
      type: 'oral_assessment' as const,
      points_possible: params.pointsPossible,
      status: 'published' as const,
    })
    .select('id')
    .single()

  if (assignmentError || !assignment) {
    throw new Error(`Failed to create assignment: ${assignmentError?.message}`)
  }

  const assignmentId = (assignment as { id: string }).id as AssignmentId

  const { error: configError } = await db.from('oral_assessment_configs').insert({
    assignment_id: assignmentId,
    prompt: params.prompt,
    preparation_time_seconds: params.preparationTimeSeconds,
    max_response_time_seconds: params.maxResponseTimeSeconds,
    follow_up_question_count: params.followUpQuestionCount,
    camera_required: params.cameraRequired,
    ai_grading_enabled: params.aiGradingEnabled,
    rubric: params.rubric.map((c) => ({
      label: c.label,
      description: c.description,
      max_points: c.maxPoints,
    })),
    selected_material_ids: params.selectedMaterialIds ?? [],
  })

  if (configError) {
    throw new Error(`Failed to create oral assessment config: ${configError.message}`)
  }

  return assignmentId
}

// ─── Reading assignment ───────────────────────────────────────────────────────

export interface ReadingAssignmentWithConfig {
  id: AssignmentId
  courseId: CourseId
  title: string
  type: 'reading_assessment'
  status: AssignmentStatus
  pointsPossible: number
  ltiLineitemUrl: string | null
  config: {
    sections: ReadingSection[]
    checkpointType: CheckpointType
    maxFollowUps: number
    aiGradingEnabled: boolean
    rubric: Array<{ label: string; description: string; maxPoints: number }>
  }
}

export async function findReadingAssignmentWithConfig(
  assignmentId: AssignmentId
): Promise<ReadingAssignmentWithConfig | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('assignments')
    .select(
      'id, course_id, title, status, points_possible, lti_lineitem_url, reading_assessment_configs(sections, checkpoint_type, max_follow_ups, ai_grading_enabled, rubric)'
    )
    .eq('id', assignmentId)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    course_id: string
    title: string
    status: string
    points_possible: number
    lti_lineitem_url: string | null
    reading_assessment_configs: {
      sections: Array<{ title: string; content: string; sourceType?: 'text' | 'pdf'; pdfStoragePath?: string }>
      checkpoint_type: string
      max_follow_ups: number
      ai_grading_enabled: boolean
      rubric: Array<{ label: string; description: string; max_points: number }>
    } | null
  }

  const config = row.reading_assessment_configs
  if (!config) return null

  return {
    id: row.id as AssignmentId,
    courseId: row.course_id as CourseId,
    title: row.title,
    type: 'reading_assessment',
    status: row.status as AssignmentStatus,
    pointsPossible: row.points_possible,
    ltiLineitemUrl: row.lti_lineitem_url,
    config: {
      sections: config.sections,
      checkpointType: config.checkpoint_type as CheckpointType,
      maxFollowUps: config.max_follow_ups,
      aiGradingEnabled: config.ai_grading_enabled,
      rubric: config.rubric.map((c) => ({
        label: c.label,
        description: c.description,
        maxPoints: c.max_points,
      })),
    },
  }
}

export interface CreateReadingAssignmentParams {
  courseId: CourseId
  createdBy: UserId
  title: string
  pointsPossible: number
  sections: ReadingSection[]
  checkpointType: CheckpointType
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
}

export async function createReadingAssignment(
  params: CreateReadingAssignmentParams
): Promise<AssignmentId> {
  const db = createServiceClient()

  const { data: assignment, error: assignmentError } = await db
    .from('assignments')
    .insert({
      course_id: params.courseId,
      created_by: params.createdBy,
      title: params.title,
      type: 'reading_assessment' as const,
      points_possible: params.pointsPossible,
      status: 'published' as const,
    })
    .select('id')
    .single()

  if (assignmentError || !assignment) {
    throw new Error(`Failed to create reading assignment: ${assignmentError?.message}`)
  }

  const assignmentId = (assignment as { id: string }).id as AssignmentId

  const { error: configError } = await db.from('reading_assessment_configs').insert({
    assignment_id: assignmentId,
    sections: params.sections,
    checkpoint_type: params.checkpointType,
    max_follow_ups: params.maxFollowUps,
    ai_grading_enabled: params.aiGradingEnabled,
    rubric: params.rubric.map((c) => ({
      label: c.label,
      description: c.description,
      max_points: c.maxPoints,
    })),
  })

  if (configError) {
    throw new Error(`Failed to create reading assessment config: ${configError.message}`)
  }

  return assignmentId
}

export interface UpdateReadingAssignmentParams {
  title: string
  pointsPossible: number
  sections: ReadingSection[]
  checkpointType: CheckpointType
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
}

export async function updateReadingAssignment(
  assignmentId: AssignmentId,
  params: UpdateReadingAssignmentParams
): Promise<void> {
  const db = createServiceClient()

  const { error: assignmentError } = await db
    .from('assignments')
    .update({ title: params.title, points_possible: params.pointsPossible })
    .eq('id', assignmentId)

  if (assignmentError) throw new Error(`Failed to update reading assignment: ${assignmentError.message}`)

  const { error: configError } = await db
    .from('reading_assessment_configs')
    .update({
      sections: params.sections,
      checkpoint_type: params.checkpointType,
      max_follow_ups: params.maxFollowUps,
      ai_grading_enabled: params.aiGradingEnabled,
      rubric: params.rubric.map((c) => ({
        label: c.label,
        description: c.description,
        max_points: c.maxPoints,
      })),
    })
    .eq('assignment_id', assignmentId)

  if (configError) throw new Error(`Failed to update reading assessment config: ${configError.message}`)
}

// Non-atomic: Supabase REST doesn't support multi-statement transactions. Steps run sequentially;
// a failure mid-way leaves partial data. Acceptable for now — fix with a stored procedure before launch.
export async function deleteAssignment(assignmentId: AssignmentId): Promise<void> {
  const db = createServiceClient()

  // grade_sync_log has no CASCADE from submissions, so delete it first
  const { data: submissionRows } = await db
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignmentId)

  const submissionIds = (submissionRows ?? []).map((r) => (r as { id: string }).id)

  if (submissionIds.length > 0) {
    const { error: syncError } = await db
      .from('grade_sync_log')
      .delete()
      .in('submission_id', submissionIds)
    if (syncError) throw new Error(`Failed to delete grade sync logs: ${syncError.message}`)

    const { error: subError } = await db
      .from('submissions')
      .delete()
      .eq('assignment_id', assignmentId)
    if (subError) throw new Error(`Failed to delete submissions: ${subError.message}`)
  }

  // oral_assessment_configs cascades automatically
  const { error } = await db
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw new Error(`Failed to delete assignment: ${error.message}`)
}
