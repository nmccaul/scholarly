'use client'

import { useState } from 'react'

interface Props {
  feedbackMessage: string
  followUpQuestion: string
  submitting: boolean
  onSubmit: (text: string) => void
}

const MIN_CHARS = 30

export function CheckpointFeedbackScreen({ feedbackMessage, followUpQuestion, submitting, onSubmit }: Props) {
  const [text, setText] = useState('')
  const canSubmit = !submitting && text.trim().length >= MIN_CHARS

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="max-w-lg w-full">
        {/* AI feedback */}
        <div className="bg-[#F0EEE8] rounded-xl p-4 mb-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#6B7280] mb-2">Feedback</p>
          <p className="text-sm text-[#24313F] leading-relaxed">{feedbackMessage}</p>
        </div>

        {/* Follow-up question */}
        <div className="bg-[#EAF2FA] border border-[#BFD7EA] rounded-xl p-4 mb-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#2563A6] mb-2">Follow-up question</p>
          <p className="text-sm font-medium text-[#1E518B] leading-relaxed">{followUpQuestion}</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your response…"
          rows={6}
          disabled={submitting}
          className="w-full rounded-xl border border-[#E3E0D8] bg-white px-4 py-3 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none disabled:opacity-60 mb-2"
        />

        <div className="flex items-center justify-between mb-4">
          <span className={['text-xs font-mono', text.trim().length < MIN_CHARS ? 'text-[#8A8F98]' : 'text-[#2F6B45]'].join(' ')}>
            {text.trim().length < MIN_CHARS ? `${MIN_CHARS - text.trim().length} more characters needed` : 'Ready to submit'}
          </span>
          <span className="text-xs text-[#8A8F98] font-mono">{text.length} chars</span>
        </div>

        <button
          onClick={() => onSubmit(text)}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563A6] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <><Spinner />Submitting…</>
          ) : (
            <>Submit response</>
          )}
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
