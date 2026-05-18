'use client'

import { useCallback, useEffect, useState } from 'react'
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

const ACTION_PHRASES: Record<CheckpointAction, string> = {
  ask_question: 'ask a question',
  share_thought: 'share a thought',
  answer_question: "answer the AI's question",
}

function joinPhrases(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, or ${parts.at(-1)}`
}

function DirectionsBar({
  checkpointPassMode,
  checkpointActions,
}: {
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
}) {
  const isActionsMode = checkpointPassMode === 'actions' && checkpointActions.length > 0
  const tail = isActionsMode
    ? joinPhrases(checkpointActions.map((a) => ACTION_PHRASES[a]))
    : 'share what stood out, ask a question, or talk through your thinking'
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="border-b border-[#E3E0D8] bg-[#FAFAF8] px-6 py-3 shrink-0">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#2563A6] mb-1.5">
        Directions
      </p>
      <p className="text-xs text-[#374151] leading-snug">
        Read the section on the left. When you&apos;re ready, click{' '}
        <span className="font-semibold text-[#18202A]">&ldquo;I&apos;ve finished reading&rdquo;</span>{' '}
        and {tail}{' '}with the AI. Once you&apos;ve shown you engaged with the material, you&apos;ll be able to move to the next checkpoint.{' '}
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="About this activity"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E3E0D8] hover:bg-[#2563A6] hover:text-white text-[#6B7280] transition-colors align-text-bottom"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="11" x2="12" y2="17" strokeLinecap="round" />
            <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </p>
      {showInfo && <ActivityInfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}

function ActivityInfoModal({ onClose }: { onClose: () => void }) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [handleEsc])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-[#E3E0D8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E3E0D8] sticky top-0 bg-white">
          <h3 className="text-sm font-semibold text-[#18202A]">About this activity</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 flex items-center justify-center rounded-md text-[#8A8F98] hover:bg-[#F0EEE8] hover:text-[#18202A] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <section>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#2563A6] mb-1">
              AI&apos;s role
            </p>
            <p className="text-xs text-[#374151] leading-relaxed">
              The AI is here as a <span className="font-semibold">collaborator</span> — a thought partner to help you engage with the reading. It is not a tutor or a shortcut. The work of reading and thinking is yours; the AI&apos;s job is to push, probe, and keep you honest.
            </p>
          </section>

          <section>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#10B981] mb-1.5">
              What the AI will do
            </p>
            <ul className="text-xs text-[#374151] leading-relaxed space-y-1 list-disc list-inside marker:text-[#10B981]">
              <li>Engage with your interpretation and push back when it&apos;s thin</li>
              <li>Answer specific questions briefly, then ask one back</li>
              <li>Probe your reasoning when you&apos;re vague or generic</li>
            </ul>
          </section>

          <section>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#C2413A] mb-1.5">
              What the AI won&apos;t do
            </p>
            <ul className="text-xs text-[#374151] leading-relaxed space-y-1 list-disc list-inside marker:text-[#C2413A]">
              <li>Summarize, recap, or read the section for you</li>
              <li>Tell you the &ldquo;right&rdquo; answer or do the thinking</li>
              <li>Let you skip the checkpoint without engaging</li>
            </ul>
          </section>

          <section>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5">
              Why this works
            </p>
            <ul className="text-xs text-[#374151] leading-relaxed space-y-1.5">
              <li>
                <span className="font-semibold text-[#18202A]">Active recall.</span> Retrieving what you read — instead of rereading — builds durable understanding.
              </li>
              <li>
                <span className="font-semibold text-[#18202A]">Generative learning.</span> Putting ideas in your own words and connecting them deepens learning far more than passive consumption.
              </li>
              <li>
                <span className="font-semibold text-[#18202A]">Protégé effect.</span> Articulating and defending your thinking out loud forces you to clarify it for yourself.
              </li>
            </ul>
          </section>
        </div>
      </div>
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
              isLastSection={state.currentSectionIndex === state.totalSections - 1}
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
