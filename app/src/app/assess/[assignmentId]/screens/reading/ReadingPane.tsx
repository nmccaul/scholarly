'use client'

import { useEffect, useRef } from 'react'
import type { ReadingSection } from '@/types/domain'

interface Props {
  unlockedSections: ReadingSection[]
  currentSectionIndex: number
  totalSections: number
  checkpointActive: boolean
  onBeginCheckpoint: () => void
  combinedPdfUrl?: string
  pdfStitching?: boolean
}

export function ReadingPane({
  unlockedSections,
  currentSectionIndex,
  totalSections,
  checkpointActive,
  onBeginCheckpoint,
  combinedPdfUrl,
  pdfStitching,
}: Props) {
  const currentSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentSectionIndex > 0 && currentSectionRef.current) {
      currentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentSectionIndex])

  const currentSection = unlockedSections[currentSectionIndex]

  return (
    <div className="flex flex-col h-full">
      {/* Header — always shows current section progress */}
      <div className="px-8 py-4 border-b border-[#E3E0D8] bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Section {currentSectionIndex + 1} of {totalSections}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSections }).map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1 w-6 rounded-full transition-colors duration-300',
                  i < currentSectionIndex
                    ? 'bg-[#10B981]'
                    : i === currentSectionIndex
                    ? 'bg-[#2563A6]'
                    : 'bg-[#E3E0D8]',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[#18202A]">{currentSection?.title}</h2>
      </div>

      {/* Body */}
      {combinedPdfUrl ? (
        // Single iframe — one scrollbar, all unlocked sections merged into one PDF
        <iframe
          src={combinedPdfUrl}
          className="flex-1 w-full border-0"
          title="Reading"
        />
      ) : pdfStitching ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-5 h-5 border-2 border-[#2563A6] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#6B7280]">Loading PDF…</p>
          </div>
        </div>
      ) : (
        // Text sections — stacked with their own scroll
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
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
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
