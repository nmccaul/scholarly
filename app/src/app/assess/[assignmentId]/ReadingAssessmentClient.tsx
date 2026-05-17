'use client'

import { useEffect, useState } from 'react'
import { useReading } from './hooks/useReading'
import { Centered } from './screens/Centered'
import { AlreadySubmittedScreen } from './screens/AlreadySubmittedScreen'
import { ErrorScreen } from './screens/ErrorScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ReadingPane } from './screens/reading/ReadingPane'
import { ReadingChatPane } from './screens/reading/ReadingChatPane'
import { ReadingVoicePane } from './screens/reading/ReadingVoicePane'
import { AllSectionsCompleteScreen } from './screens/reading/AllSectionsCompleteScreen'
import type { AssignmentId, CheckpointAction, CheckpointPassMode, CheckpointType, ReadingSection, RubricCriterion } from '@/types/domain'

interface ReadingAssignment {
  type: 'reading_assessment'
  id: AssignmentId
  title: string
  pointsPossible: number
  config: {
    sections: ReadingSection[]
    checkpointType: CheckpointType
    maxFollowUps: number
    aiGradingEnabled: boolean
    rubric: RubricCriterion[]
    checkpointPassMode: CheckpointPassMode
    checkpointActions: CheckpointAction[]
  }
}

const ENGAGEMENT_TODOS = [
  'Point to something specific in the text',
  'Share what you actually thought',
  'Connect it to something else',
  'Develop the thought beyond one line',
]

const ACTION_LABELS: Record<CheckpointAction, string> = {
  ask_question: 'Ask a question about the section',
  share_thought: 'Share a thought or observation',
  answer_question: 'Answer the AI\'s question',
}

function DirectionsBar({
  checkpointPassMode,
  checkpointActions,
}: {
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
}) {
  const isActionsMode = checkpointPassMode === 'actions' && checkpointActions.length > 0
  const todos = isActionsMode
    ? checkpointActions.map((a) => ACTION_LABELS[a])
    : ENGAGEMENT_TODOS
  const heading = isActionsMode ? 'To pass · do any one' : 'To pass this checkpoint'

  return (
    <div className="border-b border-[#E3E0D8] bg-[#FAFAF8] px-6 py-3 shrink-0">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#2563A6] mb-2">
        {heading}
      </p>
      <ul className="space-y-1">
        {todos.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#374151] leading-snug">
            <svg className="w-3.5 h-3.5 text-[#2563A6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReadingPanePlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 rounded-full bg-[#F0EEE8] flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#6B7280]">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          Read the section on the left, then click{' '}
          <span className="font-medium text-[#374151]">&ldquo;I&apos;ve finished reading&rdquo;</span> to begin the checkpoint.
        </p>
      </div>
    </div>
  )
}

export default function ReadingAssessmentClient({
  assignment,
  isInstructor = false,
}: {
  assignment: ReadingAssignment
  isInstructor?: boolean
}) {
  const state = useReading(assignment.id, assignment.config)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [checkpointActive, setCheckpointActive] = useState(false)

  useEffect(() => {
    state.startInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset checkpoint state whenever section advances
  useEffect(() => {
    setCheckpointActive(false)
  }, [state.currentSectionIndex])

  if (state.screen === 'loading') {
    return <Centered>Preparing your reading assignment…</Centered>
  }

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

  if (state.screen === 'error') {
    return <ErrorScreen message={state.errorMsg} />
  }

  if (state.screen === 'reading' && state.currentSection && state.submissionId) {
    return (
      <div className="flex h-full overflow-hidden bg-[#FAF9F6]">
        {/* Left pane — document content */}
        <div className="w-[58%] flex flex-col border-r border-[#E3E0D8] overflow-hidden">
          <ReadingPane
            sections={assignment.config.sections}
            currentSectionIndex={state.currentSectionIndex}
            checkpointActive={checkpointActive}
            onBeginCheckpoint={() => setCheckpointActive(true)}
          />
        </div>

        {/* Right pane — directions stay pinned at top, checkpoint UI below */}
        <div className="w-[42%] flex flex-col overflow-hidden">
          <DirectionsBar
            checkpointPassMode={assignment.config.checkpointPassMode}
            checkpointActions={assignment.config.checkpointActions}
          />
          {!checkpointActive ? (
            <ReadingPanePlaceholder />
          ) : assignment.config.checkpointType === 'text' ? (
            <ReadingChatPane
              submissionId={state.submissionId}
              sectionIndex={state.currentSectionIndex}
              onCheckpointResolved={state.onCheckpointResolved}
            />
          ) : (
            <ReadingVoicePane
              submissionId={state.submissionId}
              sectionIndex={state.currentSectionIndex}
              sectionTitle={state.currentSection.title}
              sectionContent={state.currentSection.content}
              checkpointPassMode={assignment.config.checkpointPassMode}
              checkpointActions={assignment.config.checkpointActions}
              onCheckpointResolved={state.onCheckpointResolved}
            />
          )}
        </div>
      </div>
    )
  }

  if (state.screen === 'all-sections-complete') {
    return (
      <AllSectionsCompleteScreen
        totalSections={state.totalSections}
        submitting={submittingFinal}
        onSubmit={async () => {
          setSubmittingFinal(true)
          await state.onConfirmSubmit()
          setSubmittingFinal(false)
        }}
      />
    )
  }

  if (state.screen === 'grading') {
    return <Centered>Grading your reading engagement… this may take a moment.</Centered>
  }

  if (state.screen === 'result' && state.gradeResult) {
    return <ResultScreen result={state.gradeResult} assignmentId={assignment.id} />
  }

  return null
}
