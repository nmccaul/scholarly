import type { AssignmentId, SubmissionId, AssignmentType, AssignmentStatus, CourseId, AiGradeRationale, CourseMaterialId } from './domain'

export interface RubricCriterionInput {
  label: string
  description: string
  maxPoints: number
}

export interface CourseMaterialInput {
  title: string
  content: string
}

export interface CourseMaterialResponse {
  id: CourseMaterialId
  title: string
  content: string
  createdAt: string
}

export interface CreateOralAssessmentRequest {
  title: string
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds?: string[]
  assignmentMaterials?: CourseMaterialInput[]
  // From the Deep Link context passed to the builder
  returnUrl: string
  dlData?: string
}

export interface UpdateOralAssessmentRequest {
  title: string
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds?: string[]
  assignmentMaterials?: CourseMaterialInput[]
}

export interface CreateAssignmentResponse {
  assignmentId: AssignmentId
  jwt: string
  returnUrl: string
}

// ─── Assignment fetch ─────────────────────────────────────────────────────────

export interface AssignmentConfigResponse {
  id: AssignmentId
  courseId: CourseId
  title: string
  type: AssignmentType
  status: AssignmentStatus
  pointsPossible: number
  config: {
    prompt: string
    preparationTimeSeconds: number
    maxResponseTimeSeconds: number
    followUpQuestionCount: number
    cameraRequired: boolean
    aiGradingEnabled: boolean
    rubric: RubricCriterionInput[]
    selectedMaterialIds: string[]
  }
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface CreateSubmissionResponse {
  submissionId: SubmissionId
  uploadUrl: string   // Supabase Storage signed upload URL for the main recording
  alreadySubmitted?: boolean
}

export interface GenerateFollowUpRequest {
  // intentionally empty — server derives question index from DB state
}

export interface GenerateFollowUpResponse {
  question: string
  questionIndex: number  // server-authoritative index for the transcribe route
  uploadUrl: string      // Supabase Storage signed upload URL for the follow-up answer
}

export interface SubmitRequest {
  transcript: string  // user-edited transcript from the review screen
}

export interface SubmitResponse {
  aiGrade: number | null
  aiGradeRationale: AiGradeRationale | null
  finalGrade: number | null
  pointsPossible: number
  syncStatus: 'success' | 'failed' | null  // null = no Canvas lineitem (dev mode or AI grading off)
}

// ─── Assignment generation ────────────────────────────────────────────────────

export interface GenerateAssignmentRequest {
  materialIds: string[]
  assignmentMaterials: CourseMaterialInput[]
  direction: string
}

export interface GenerateAssignmentResponse {
  title: string
  prompt: string
  rubric: RubricCriterionInput[]
}

// ─── Grade override ───────────────────────────────────────────────────────────

export interface GradeOverrideRequest {
  finalGrade: number
  teacherFeedback?: string
}

export interface GradeOverrideResponse {
  finalGrade: number
  teacherFeedback: string | null
  syncStatus: 'pending' | 'success' | 'failed' | null  // null = no lineitem URL to sync
}
