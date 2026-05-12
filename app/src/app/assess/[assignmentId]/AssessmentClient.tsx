'use client'

import { useAssessment } from './hooks/useAssessment'
import { Centered } from './screens/Centered'
import { AlreadySubmittedScreen } from './screens/AlreadySubmittedScreen'
import { ErrorScreen } from './screens/ErrorScreen'
import { PrepScreen } from './screens/PrepScreen'
import { RecordScreen } from './screens/RecordScreen'
import { FollowUpScreen } from './screens/FollowUpScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { ResultScreen } from './screens/ResultScreen'
import type { AssignmentId } from '@/types/domain'

// Only the fields the client actually needs — sensitive server fields are stripped in page.tsx
export interface ClientAssignment {
  id: AssignmentId
  title: string
  pointsPossible: number
  config: {
    prompt: string
    preparationTimeSeconds: number
    maxResponseTimeSeconds: number
    followUpQuestionCount: number
    cameraRequired: boolean
  }
}

export default function AssessmentClient({
  assignment,
  isInstructor = false,
}: {
  assignment: ClientAssignment
  isInstructor?: boolean
}) {
  const state = useAssessment(assignment.id, assignment.config)

  if (state.screen === 'loading') return <Centered>Preparing your assessment…</Centered>

  if (state.screen === 'already-submitted') {
    return (
      <AlreadySubmittedScreen
        assignmentId={assignment.id}
        isInstructor={isInstructor}
        resetting={state.resetting}
        onReset={state.handleReset}
      />
    )
  }

  if (state.screen === 'error') return <ErrorScreen message={state.errorMsg} />

  if (state.screen === 'prep') {
    return (
      <PrepScreen
        secondsLeft={state.secondsLeft}
        prompt={assignment.config.prompt}
        onStartNow={state.enterRecordPhase}
      />
    )
  }

  if (state.screen === 'record') {
    return (
      <RecordScreen
        secondsLeft={state.secondsLeft}
        maxResponseTimeSeconds={assignment.config.maxResponseTimeSeconds}
        prompt={assignment.config.prompt}
        cameraRequired={assignment.config.cameraRequired}
        videoRef={state.videoRef}
        onStop={state.stopMainRecording}
      />
    )
  }

  if (state.screen === 'processing') {
    return <Centered>Processing your response… this may take a moment.</Centered>
  }

  if (state.screen === 'follow-up') {
    return (
      <FollowUpScreen
        phase={state.followUpPhase}
        displayIndex={state.followUpDisplayIndex}
        totalCount={assignment.config.followUpQuestionCount}
        currentQuestion={state.currentQuestion}
        secondsLeft={state.secondsLeft}
        maxResponseTimeSeconds={assignment.config.maxResponseTimeSeconds}
        cameraRequired={assignment.config.cameraRequired}
        videoRef={state.videoRef}
        onStartRecording={state.enterFollowUpRecordPhase}
        onStopRecording={state.stopFollowUpRecording}
      />
    )
  }

  if (state.screen === 'review') {
    return (
      <ReviewScreen
        transcript={state.transcript}
        followUpExchanges={state.followUpExchanges}
        onSubmit={state.handleSubmit}
      />
    )
  }

  if (state.screen === 'grading') {
    return <Centered>Grading your submission… this may take a moment.</Centered>
  }

  if (state.screen === 'result' && state.gradeResult) {
    return <ResultScreen result={state.gradeResult} assignmentId={assignment.id} />
  }

  return null
}
