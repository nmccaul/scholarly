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

function ReadingDirections({ checkpointType }: { checkpointType: CheckpointType }) {
  const modeNoun = checkpointType === 'voice' ? 'voice conversation' : 'text conversation'

  const checkpointTodos = [
    {
      title: 'Identify the argument',
      body: 'Say what the section is actually arguing — not just what it discusses or describes.',
    },
    {
      title: 'Evaluate the evidence',
      body: 'Take a stance on whether the reasoning and evidence hold up. What works? What doesn\'t?',
    },
    {
      title: 'Make a connection',
      body: 'Tie it to something you already know — another reading, an example, a real situation.',
    },
    {
      title: 'Share your position',
      body: 'Tell the AI what you think and why. Genuine reasoning beats agreement.',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="max-w-md mx-auto">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#2563A6] mb-2">
          To unlock the next section
        </p>
        <h3 className="text-lg font-semibold text-[#18202A] mb-1.5">
          Be ready to discuss this
        </h3>
        <p className="text-xs text-[#6B7280] leading-relaxed mb-5">
          When you click <span className="font-medium text-[#374151]">&ldquo;I&apos;ve finished reading&rdquo;</span>, you&apos;ll start a {modeNoun} with AI. To pass and unlock the next section, your responses should hit these:
        </p>

        <div className="space-y-2">
          {checkpointTodos.map((todo, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-[#EAF2FA] border border-[#BFD7EA] px-3.5 py-2.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2563A6] text-white text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#18202A] leading-snug">{todo.title}</p>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-0.5">{todo.body}</p>
              </div>
            </div>
          ))}
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
            <ReadingDirections checkpointType={assignment.config.checkpointType} />
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
