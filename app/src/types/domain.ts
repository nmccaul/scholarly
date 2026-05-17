// Value objects — never pass raw strings for these IDs
export type RegistrationId = string & { readonly _brand: 'RegistrationId' }
export type UserId = string & { readonly _brand: 'UserId' }
export type CourseId = string & { readonly _brand: 'CourseId' }
export type AssignmentId = string & { readonly _brand: 'AssignmentId' }
export type SubmissionId = string & { readonly _brand: 'SubmissionId' }
export type LtiSub = string & { readonly _brand: 'LtiSub' }
export type CourseMaterialId = string & { readonly _brand: 'CourseMaterialId' }

export type UserRole = 'instructor' | 'learner'

export type AssignmentType = 'oral_assessment' | 'reading_assessment'

export type CheckpointType = 'text' | 'voice'

export type CheckpointPassMode = 'engagement' | 'actions'
export type CheckpointAction = 'ask_question' | 'share_thought' | 'answer_question'

export type CheckpointStatus = 'locked' | 'in_progress' | 'passed' | 'force_unlocked'

export type AssignmentStatus = 'draft' | 'published' | 'archived'

export type SubmissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'grading'
  | 'graded'
  | 'error'

export type GradeSyncStatus = 'pending' | 'success' | 'failed'

// Session stored server-side after successful LTI launch
export interface LtiSession {
  userId: UserId
  registrationId: RegistrationId
  courseId: CourseId
  deploymentId: string
  role: UserRole
  ltiSub: LtiSub
  expiresAt: number // Unix timestamp
}

// LTI Registration (one per Canvas instance)
export interface LtiRegistration {
  id: RegistrationId
  clientId: string
  deploymentId: string
  platformIss: string
  platformName: string | null
  oidcAuthUrl: string
  jwksUrl: string
  tokenUrl: string
}

export interface RubricCriterion {
  label: string
  description: string
  maxPoints: number
}

export interface ReadingSection {
  title: string
  content: string
  sourceType?: 'text' | 'pdf'
  pdfStoragePath?: string
  pdfUrl?: string  // signed URL populated server-side for student display
}

export interface CheckpointConversationTurn {
  role: 'student' | 'ai'
  text: string
}

export interface ReadingCheckpoint {
  id: string
  submissionId: SubmissionId
  sectionIndex: number
  conversation: CheckpointConversationTurn[]
  status: CheckpointStatus
  startedAt: string | null
  passedAt: string | null
  followUpCount: number
  aiFeedback: string | null
}

export interface ReadingAssignmentConfig {
  assignmentId: AssignmentId
  sections: ReadingSection[]
  checkpointType: CheckpointType
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterion[]
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
}

export interface OralAssessmentConfig {
  assignmentId: AssignmentId
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterion[]
}

export interface FollowUpExchange {
  question: string
  answerTranscript: string
  answerRecordingUrl: string | null
}

export interface CriterionScore {
  label: string
  score: number
  rationale: string
}

export interface AiGradeRationale {
  criteriaScores: CriterionScore[]
  overallFeedback: string
}
