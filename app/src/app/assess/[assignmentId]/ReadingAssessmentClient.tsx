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
import type { AssignmentId, CheckpointType, ReadingSection, RubricCriterion } from '@/types/domain'

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
  }
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
    const unlockedSections = assignment.config.sections.slice(0, state.currentSectionIndex + 1)

    return (
      <div className="flex h-screen overflow-hidden bg-[#FAF9F6]">
        {/* Left pane — document content */}
        <div className="w-[58%] flex flex-col border-r border-[#E3E0D8] overflow-hidden">
          <ReadingPane
            unlockedSections={unlockedSections}
            currentSectionIndex={state.currentSectionIndex}
            totalSections={state.totalSections}
            checkpointActive={checkpointActive}
            onBeginCheckpoint={() => setCheckpointActive(true)}
          />
        </div>

        {/* Right pane — checkpoint interface */}
        <div className="w-[42%] flex flex-col overflow-hidden">
          {!checkpointActive ? (
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="text-center max-w-xs">
                <div className="w-12 h-12 rounded-full bg-[#F0EEE8] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#6B7280]">
                    <path
                      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12 8v4m0 4h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Read the section on the left, then click{' '}
                  <span className="font-medium text-[#374151]">&ldquo;I&apos;ve finished reading&rdquo;</span> to
                  begin the checkpoint.
                </p>
              </div>
            </div>
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
