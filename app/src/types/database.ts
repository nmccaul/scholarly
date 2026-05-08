// Database row types — mirror Supabase schema exactly.
// These are generated from schema; do not write business logic here.

export interface DbLtiRegistration {
  id: string
  client_id: string
  deployment_id: string
  platform_iss: string
  platform_name: string | null
  oidc_auth_url: string
  jwks_url: string
  token_url: string
  created_at: string
}

export interface DbUser {
  id: string
  registration_id: string
  lti_sub: string
  email: string | null
  name: string | null
  given_name: string | null
  family_name: string | null
  picture_url: string | null
  created_at: string
  updated_at: string
}

export interface DbCourse {
  id: string
  registration_id: string
  lti_context_id: string
  title: string | null
  label: string | null
  canvas_course_id: string | null
  created_at: string
  updated_at: string
}

export interface DbAssignment {
  id: string
  course_id: string
  created_by: string
  resource_link_id: string | null
  lti_lineitem_url: string | null
  title: string
  type: 'oral_assessment'
  points_possible: number
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
}

export interface DbOralAssessmentConfig {
  id: string
  assignment_id: string
  prompt: string
  preparation_time_seconds: number
  max_response_time_seconds: number
  follow_up_question_count: number
  camera_required: boolean
  ai_grading_enabled: boolean
  rubric: Array<{ label: string; description: string; max_points: number }>
  created_at: string
  updated_at: string
}

export interface DbSubmission {
  id: string
  assignment_id: string
  student_id: string
  status: 'in_progress' | 'submitted' | 'grading' | 'graded' | 'error'
  started_at: string
  submitted_at: string | null
  created_at: string
}

export interface DbOralAssessmentSubmission {
  id: string
  submission_id: string
  recording_url: string | null
  transcript: string | null
  follow_up_exchanges: Array<{
    question: string
    answer_transcript: string
    answer_recording_url: string | null
  }> | null
  ai_grade: number | null
  ai_grade_rationale: {
    criteria_scores: Array<{ label: string; score: number; rationale: string }>
    overall_feedback: string
  } | null
  final_grade: number | null
  teacher_feedback: string | null
  graded_by: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
}

export interface DbGradeSyncLog {
  id: string
  submission_id: string
  score: number
  status: 'pending' | 'success' | 'failed'
  canvas_response: unknown | null
  attempt: number
  synced_at: string
}
