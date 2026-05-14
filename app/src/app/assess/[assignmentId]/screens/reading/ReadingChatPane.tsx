'use client'

import { useState, useEffect, useRef } from 'react'
import type { CheckpointEvaluationResponse } from '@/types/api'

type PaneStatus = 'chatting' | 'submitting' | 'passed' | 'force-unlocked'

interface Message {
  role: 'ai' | 'student'
  text: string
}

interface Props {
  submissionId: string
  sectionIndex: number
  onCheckpointResolved: (newSectionIndex: number) => void
}

const SCAFFOLD_QUESTION =
  'Go ahead and share anything about this section — a summary, what stood out to you, or any questions you have.'

export function ReadingChatPane({ submissionId, sectionIndex, onCheckpointResolved }: Props) {
  const [status, setStatus] = useState<PaneStatus>('chatting')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: SCAFFOLD_QUESTION },
  ])
  const [input, setInput] = useState('')
  const [followUpIndex, setFollowUpIndex] = useState<number | null>(null)
  const [resolvedSectionIndex, setResolvedSectionIndex] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset when section changes
  useEffect(() => {
    setStatus('chatting')
    setMessages([{ role: 'ai', text: SCAFFOLD_QUESTION }])
    setInput('')
    setFollowUpIndex(null)
    setResolvedSectionIndex(null)
  }, [sectionIndex])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  // Auto-advance after resolution
  useEffect(() => {
    if ((status === 'passed' || status === 'force-unlocked') && resolvedSectionIndex !== null) {
      const delay = status === 'passed' ? 2500 : 3500
      const timer = setTimeout(() => onCheckpointResolved(resolvedSectionIndex), delay)
      return () => clearTimeout(timer)
    }
  }, [status, resolvedSectionIndex, onCheckpointResolved])

  async function handleSubmit() {
    const text = input.trim()
    if (!text || status !== 'chatting') return

    setMessages((prev) => [...prev, { role: 'student', text }])
    setInput('')
    setStatus('submitting')

    try {
      const endpoint =
        followUpIndex === null
          ? `/api/submissions/${submissionId}/checkpoint/${sectionIndex}`
          : `/api/submissions/${submissionId}/checkpoint/${sectionIndex}/follow-up/${followUpIndex}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data: CheckpointEvaluationResponse & { error?: string } = await res.json()
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: data.error ?? 'Something went wrong. Please try again.' },
        ])
        setStatus('chatting')
        return
      }

      if (data.passed) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.feedbackMessage }])
        setResolvedSectionIndex(sectionIndex + 1)
        setStatus('passed')
        return
      }

      if (data.forceUnlocked) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.feedbackMessage }])
        setResolvedSectionIndex(sectionIndex + 1)
        setStatus('force-unlocked')
        return
      }

      // Follow-up: add feedback then follow-up question as separate bubbles
      const newMessages: Message[] = [{ role: 'ai', text: data.feedbackMessage }]
      if (data.nextQuestion) {
        newMessages.push({ role: 'ai', text: data.nextQuestion })
      }
      setMessages((prev) => [...prev, ...newMessages])
      setFollowUpIndex(data.followUpIndex ?? null)
      setStatus('chatting')
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Network error. Please try again.' },
      ])
      setStatus('chatting')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = input.trim().length >= 10 && status === 'chatting'
  const charsNeeded = Math.max(0, 10 - input.trim().length)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#E3E0D8] bg-[#FAFAF8] shrink-0">
        <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
          Checkpoint
        </div>
        <div className="text-xs text-[#8A8F98] mt-0.5">
          Engage with the material to unlock the next section
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={['flex', msg.role === 'student' ? 'justify-end' : 'justify-start'].join(' ')}
          >
            <div
              className={[
                'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'student'
                  ? 'bg-[#2563A6] text-white rounded-br-sm'
                  : 'bg-[#F0EEE8] text-[#18202A] rounded-bl-sm',
              ].join(' ')}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {status === 'submitting' && (
          <div className="flex justify-start">
            <div className="bg-[#F0EEE8] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Resolution banners */}
        {status === 'passed' && (
          <div className="flex justify-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center">
              <div className="text-emerald-700 font-semibold text-sm">Checkpoint passed ✓</div>
              <div className="text-emerald-600 text-xs mt-0.5">Moving to next section…</div>
            </div>
          </div>
        )}

        {status === 'force-unlocked' && (
          <div className="flex justify-center">
            <div className="bg-amber-50 border border amber-200 rounded-xl px-5 py-3 text-center">
              <div className="text-amber-700 font-semibold text-sm">Section unlocked</div>
              <div className="text-amber-600 text-xs mt-0.5">
                Your engagement has been recorded. Continuing…
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {(status === 'chatting' || status === 'submitting') && (
        <div className="px-5 py-4 border-t border-[#E3E0D8] shrink-0">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response… (⌘↵ to send)"
              disabled={status === 'submitting'}
              rows={3}
              className="w-full px-4 py-3 pr-12 text-sm text-[#18202A] bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-lg bg-[#2563A6] text-white hover:bg-[#1E518B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L13 7L7 13M13 7H1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          {charsNeeded > 0 && (
            <div className="text-[11px] text-[#8A8F98] mt-1.5">
              {charsNeeded} more character{charsNeeded !== 1 ? 's' : ''} needed
            </div>
          )}
        </div>
      )}
    </div>
  )
}
