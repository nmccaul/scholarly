import type { AssignmentId, SubmissionId, AssignmentType, AssignmentStatus, CourseId, AiGradeRationale, CourseMaterialId, CheckpointConversationTurn } from './domain'

export interface RubricCriterionInput {
  label: string
  description: string
  maxPoints: number
}

export interface CourseMaterialInput {
  title: string
  content: string
  pdfStoragePath?: string
}

export interface CourseMaterialResponse {
  id: CourseMaterialId
  title: string
  content: string
  pdfStoragePath?: string
  createdAt: string
}

export interface ProcessPdfSectionResult {
  title: string
  content: string
  pdfStoragePath: string
  startPage: number
  endPage: number
}

export interface ProcessPdfResponse {
  title: string
  sections: ProcessPdfSectionResult[]
  rubric: RubricCriterionInput[]
  totalPages: number
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
  uploadUrl: string
  alreadySubmitted?: boolean
  currentSectionIndex?: number  // reading assignments only — enables resume on re-launch
}

// Intentionally empty — server derives question index from DB state.
export type GenerateFollowUpRequest = Record<string, never>

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

// ─── Reading assignment builder ───────────────────────────────────────────────

export interface CreateReadingAssessmentRequest {
  title: string
  sections: Array<{ title: string; content: string; sourceType?: 'text' | 'pdf'; pdfStoragePath?: string }>
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  returnUrl: string
  dlData?: string
}

export interface UpdateReadingAssessmentRequest {
  title: string
  sections: Array<{ title: string; content: string; sourceType?: 'text' | 'pdf'; pdfStoragePath?: string }>
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
}

export interface GenerateReadingAssignmentRequest {
  materialIds: string[]
  assignmentMaterials: CourseMaterialInput[]
  direction: string
}

export interface GenerateReadingAssignmentResponse {
  title: string
  sections: Array<{ title: string; content: string; sourceType?: 'text' | 'pdf'; pdfStoragePath?: string }>
  rubric: RubricCriterionInput[]
}

// ─── Reading checkpoint (text mode) ──────────────────────────────────────────

export interface CheckpointEvaluationResponse {
  passed: boolean
  forceUnlocked: boolean
  feedbackMessage: string
  nextQuestion: string | null   // null when passed or force-unlocked
  followUpIndex: number | null
}

// ─── Reading checkpoint (voice mode) ─────────────────────────────────────────

export interface RealtimeSessionResponse {
  clientSecret: string  // session.client_secret.value — short-lived, browser-only
}

export interface CompleteCheckpointRequest {
  conversation: CheckpointConversationTurn[]
  passed: boolean
  aiFeedback: string
}

export interface CompleteCheckpointResponse {
  nextSectionUnlocked: boolean
  newSectionIndex: number
  totalSections: number
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

// ─── Mission Control insights chat ───────────────────────────────────────────

export interface InsightsChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface InsightsChatRequest {
  messages: InsightsChatMessage[]
}
