'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReadingSection } from '@/types/domain'

interface Props {
  sections: ReadingSection[]
  currentSectionIndex: number
  checkpointActive: boolean
  onBeginCheckpoint: () => void
}

export function ReadingPane({
  sections,
  currentSectionIndex,
  checkpointActive,
  onBeginCheckpoint,
}: Props) {
  const currentSectionRef = useRef<HTMLDivElement>(null)
  const prevIndexRef = useRef(currentSectionIndex)
  const [justPassedIndex, setJustPassedIndex] = useState<number | null>(null)

  // Detect section transitions to trigger celebration
  useEffect(() => {
    if (currentSectionIndex > prevIndexRef.current) {
      setJustPassedIndex(prevIndexRef.current)
      const timer = setTimeout(() => setJustPassedIndex(null), 2600)
      prevIndexRef.current = currentSectionIndex
      return () => clearTimeout(timer)
    }
    prevIndexRef.current = currentSectionIndex
  }, [currentSectionIndex])

  useEffect(() => {
    if (currentSectionIndex > 0 && currentSectionRef.current) {
      currentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentSectionIndex])

  const totalSections = sections.length
  const currentSection = sections[currentSectionIndex]
  const currentPdfUrl = currentSection?.pdfUrl
  const justPassedSection = justPassedIndex !== null ? sections[justPassedIndex] : null
  const unlockedSections = sections.slice(0, currentSectionIndex + 1)
  const progressPct = Math.round((currentSectionIndex / totalSections) * 100)

  return (
    <div className="relative flex flex-col h-full">
      <style>{`
        @keyframes celebrate {
          0%   { opacity: 0; transform: translate(-50%, -12px) scale(0.92); }
          12%  { opacity: 1; transform: translate(-50%, 0) scale(1.04); }
          22%  { transform: translate(-50%, 0) scale(1); }
          78%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -8px) scale(0.96); }
        }
        @keyframes pillpop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes ripple {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .pane-celebrate { animation: celebrate 2.6s ease-out forwards; }
        .pill-pop { animation: pillpop 0.7s cubic-bezier(.34,1.56,.64,1) forwards; }
        .pill-ripple { animation: ripple 1.1s ease-out forwards; }
      `}</style>

      {/* Header — section stepper */}
      <div className="px-6 py-4 border-b border-[#E3E0D8] bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Section {currentSectionIndex + 1} of {totalSections}
          </div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#10B981]">
            {currentSectionIndex} / {totalSections} complete · {progressPct}%
          </div>
        </div>
        <SectionStepper
          sections={sections}
          currentSectionIndex={currentSectionIndex}
          justPassedIndex={justPassedIndex}
        />
        <h2 className="mt-3 text-lg font-semibold text-[#18202A]">{currentSection?.title}</h2>
      </div>

      {/* Celebration toast */}
      {justPassedSection && (
        <div
          key={`celebrate-${justPassedIndex}`}
          className="pane-celebrate pointer-events-none absolute left-1/2 z-30"
          style={{ top: '124px' }}
        >
          <div className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] px-5 py-2.5 text-white shadow-2xl ring-2 ring-white/30">
            <CheckmarkIcon className="w-5 h-5" />
            <div className="text-sm font-semibold whitespace-nowrap">
              Section {(justPassedIndex ?? 0) + 1} complete · {justPassedSection.title}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      {currentPdfUrl ? (
        <iframe
          key={currentPdfUrl}
          src={currentPdfUrl}
          className="flex-1 w-full border-0 bg-[#525659]"
          title={currentSection?.title ?? 'Reading'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {unlockedSections.map((section, i) => {
            const isCompleted = i < currentSectionIndex
            const isCurrent = i === currentSectionIndex
            return (
              <div key={i} ref={isCurrent ? currentSectionRef : null}>
                {i > 0 && (
                  <div className="flex items-center gap-4 px-8 py-4">
                    <div className="flex-1 h-px bg-[#E3E0D8]" />
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#10B981] shrink-0">
                      <CheckmarkIcon className="w-3.5 h-3.5" />
                      Section {i} complete
                    </span>
                    <div className="flex-1 h-px bg-[#E3E0D8]" />
                  </div>
                )}
                {isCompleted && (
                  <div className="px-8 pb-3">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-0.5">
                      Section {i + 1}
                    </p>
                    <h3 className="text-base font-semibold text-[#6B7280]">{section.title}</h3>
                  </div>
                )}
                <div className="px-8 py-6">
                  <div className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="h-4" />
        </div>
      )}

      {/* Footer */}
      <div className="px-8 py-4 border-t border-[#E3E0D8] bg-white shrink-0">
        {checkpointActive ? (
          <div className="text-center text-xs text-[#6B7280] py-1">
            Complete the checkpoint on the right to continue
          </div>
        ) : (
          <button
            onClick={onBeginCheckpoint}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
          >
            I&apos;ve finished reading →
          </button>
        )}
      </div>
    </div>
  )
}

function SectionStepper({
  sections,
  currentSectionIndex,
  justPassedIndex,
}: {
  sections: ReadingSection[]
  currentSectionIndex: number
  justPassedIndex: number | null
}) {
  return (
    <div className="flex items-start gap-1">
      {sections.map((section, i) => {
        const isCompleted = i < currentSectionIndex
        const isCurrent = i === currentSectionIndex
        const isJustPassed = i === justPassedIndex
        const isLast = i === sections.length - 1

        return (
          <div key={i} className="flex-1 flex flex-col items-stretch min-w-0">
            <div className="flex items-center">
              <div className="relative flex items-center justify-center shrink-0">
                {/* Ripple effect on just-passed */}
                {isJustPassed && (
                  <span className="pill-ripple absolute inset-0 m-auto w-8 h-8 rounded-full bg-[#10B981]" />
                )}
                <div
                  className={[
                    'relative flex items-center justify-center rounded-full transition-all duration-500',
                    isCurrent
                      ? 'w-9 h-9 bg-[#2563A6] text-white ring-4 ring-[#EAF2FA] shadow-md'
                      : isCompleted
                      ? 'w-8 h-8 bg-[#10B981] text-white shadow-sm'
                      : 'w-8 h-8 bg-white border-2 border-[#E3E0D8] text-[#AEB8C2]',
                    isJustPassed ? 'pill-pop' : '',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <CheckmarkIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-[#E3E0D8]">
                  <div
                    className={[
                      'h-full transition-all duration-700 ease-out',
                      isCompleted ? 'w-full bg-[#10B981]' : 'w-0 bg-[#10B981]',
                    ].join(' ')}
                  />
                </div>
              )}
            </div>
            <div className="mt-1.5 pr-2">
              <p
                className={[
                  'text-[11px] leading-tight truncate transition-colors',
                  isCurrent
                    ? 'font-semibold text-[#18202A]'
                    : isCompleted
                    ? 'font-medium text-[#374151]'
                    : 'text-[#AEB8C2]',
                ].join(' ')}
                title={section.title}
              >
                {section.title}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
