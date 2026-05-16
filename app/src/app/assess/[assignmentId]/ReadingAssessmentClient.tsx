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

function ReadingDirections({
  rubric,
  checkpointType,
  totalPoints,
}: {
  rubric: RubricCriterion[]
  checkpointType: CheckpointType
  totalPoints: number
}) {
  const modeCopy = checkpointType === 'voice'
    ? 'speak with AI through a voice conversation'
    : 'have a text conversation with AI'

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="max-w-md mx-auto">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">
          While you read
        </p>
        <h3 className="text-lg font-semibold text-[#18202A] mb-1.5">
          What you&apos;ll be graded on
        </h3>
        <p className="text-xs text-[#6B7280] leading-relaxed mb-5">
          After each section, you&apos;ll {modeCopy} about what you read. Your full conversations are graded together at the end against the rubric below.
        </p>

        <div className="space-y-2.5 mb-6">
          {rubric.map((criterion, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E3E0D8] bg-white p-3.5 hover:border-[#AEB8C2] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <h4 className="text-sm font-semibold text-[#18202A] leading-snug">
                  {criterion.label}
                </h4>
                <span className="font-mono text-[10px] font-semibold text-[#2563A6] bg-[#EAF2FA] px-1.5 py-0.5 rounded shrink-0">
                  {criterion.maxPoints} pts
                </span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {criterion.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-md bg-[#FAF9F6] border border-[#E3E0D8] px-3.5 py-2.5 mb-5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#6B7280]">
            Total possible
          </span>
          <span className="font-mono text-sm font-semibold text-[#18202A]">
            {totalPoints} pts
          </span>
        </div>

        <div className="rounded-md border border-dashed border-[#D4CEC3] px-3.5 py-3 text-center">
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Read the section on the left, then click{' '}
            <span className="font-medium text-[#374151]">&ldquo;I&apos;ve finished reading&rdquo;</span> to begin the checkpoint.
          </p>
        </div>
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

        {/* Right pane — checkpoint interface */}
        <div className="w-[42%] flex flex-col overflow-hidden">
          {!checkpointActive ? (
            <ReadingDirections
              rubric={assignment.config.rubric}
              checkpointType={assignment.config.checkpointType}
              totalPoints={assignment.pointsPossible}
            />
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
