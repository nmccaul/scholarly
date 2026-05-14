'use client'

import { useRef, useState } from 'react'
import type { InsightsChatMessage, InsightsChatRequest } from '@/types/api'

const SUGGESTED_PROMPTS = [
  'Which students struggled most?',
  'What were the most common misconceptions?',
  'Who passed every checkpoint on first try?',
]

interface Props {
  assignmentId: string
}

export default function InsightsChatInterface({ assignmentId }: Props) {
  const [messages, setMessages] = useState<InsightsChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    const userMessage: InsightsChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages([...nextMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    setError(null)

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/insights/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages } satisfies InsightsChatRequest),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
      accumulated += decoder.decode()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: accumulated }
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1)
        return prev
      })
    } finally {
      setStreaming(false)
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="h-full flex flex-col bg-[#FAF9F6]">

      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-[#E3E0D8] bg-white">
        <div className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest">
          Chat with class data
        </div>
        <p className="text-xs text-[#AEB8C2] mt-0.5">
          Ask anything about your students&apos; engagement and performance
        </p>
      </div>

      {/* Message area — flex-1 fills remaining height */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm font-medium text-[#374151]">Ask about your class</p>
              <p className="text-xs text-[#8A8F98] mt-1">
                All student checkpoint conversations are loaded as context.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#374151] bg-white border border-[#E3E0D8] rounded-lg hover:border-[#2563A6] hover:text-[#2563A6] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && msg.content === '' && streaming ? (
                  <div className="bg-white border border-[#E3E0D8] rounded-xl px-4 py-2.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A8F98] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div
                    className={[
                      'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[#2563A6] text-white'
                        : 'bg-white border border-[#E3E0D8] text-[#18202A] whitespace-pre-wrap',
                    ].join(' ')}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 mx-6 mb-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
          <p className="text-xs text-amber-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-amber-500 hover:text-amber-700 shrink-0 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input — pinned to bottom */}
      <div className="shrink-0 px-6 py-4 border-t border-[#E3E0D8] bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about your class…"
            disabled={streaming}
            className="flex-1 resize-none text-sm border border-[#E3E0D8] rounded-lg px-3 py-2 text-[#18202A] placeholder-[#AEB8C2] focus:outline-none focus:border-[#2563A6] disabled:opacity-50 disabled:bg-[#FAF9F6] bg-white"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {streaming ? 'Asking…' : 'Ask'}
          </button>
        </form>
        <p className="text-[10px] text-[#AEB8C2] mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>

    </div>
  )
}
