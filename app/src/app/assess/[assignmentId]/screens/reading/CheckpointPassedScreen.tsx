'use client'

import { useEffect } from 'react'

interface Props {
  feedbackMessage: string | null
  isLastSection: boolean
  onContinue: () => void
}

export function CheckpointPassedScreen({ feedbackMessage, isLastSection, onContinue }: Props) {
  useEffect(() => {
    const timer = setTimeout(onContinue, 2500)
    return () => clearTimeout(timer)
  }, [onContinue])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#EAF3ED] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#2F6B45]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#18202A] mb-2">Checkpoint passed</h2>
        {feedbackMessage && (
          <p className="text-sm text-[#6B7280] leading-relaxed mb-4">{feedbackMessage}</p>
        )}
        <p className="text-xs text-[#8A8F98]">
          {isLastSection ? 'Proceeding to submission…' : 'Loading next section…'}
        </p>
      </div>
    </div>
  )
}
