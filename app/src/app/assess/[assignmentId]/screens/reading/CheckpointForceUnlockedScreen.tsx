'use client'

import { useEffect } from 'react'

interface Props {
  feedbackMessage: string | null
  isLastSection: boolean
  onContinue: () => void
}

export function CheckpointForceUnlockedScreen({ feedbackMessage, isLastSection, onContinue }: Props) {
  useEffect(() => {
    const timer = setTimeout(onContinue, 3500)
    return () => clearTimeout(timer)
  }, [onContinue])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#FEF3E7] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#B45309]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#18202A] mb-2">Section unlocked</h2>
        <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
          Maximum follow-up attempts reached. The next section has been unlocked, but your engagement level will be reflected in your grade.
        </p>
        {feedbackMessage && (
          <div className="bg-[#FEF9EC] border border-[#F5D98E] rounded-lg p-3 mb-4 text-left">
            <p className="text-xs text-[#92400E] leading-relaxed">{feedbackMessage}</p>
          </div>
        )}
        <p className="text-xs text-[#8A8F98]">
          {isLastSection ? 'Proceeding to submission…' : 'Loading next section…'}
        </p>
      </div>
    </div>
  )
}
