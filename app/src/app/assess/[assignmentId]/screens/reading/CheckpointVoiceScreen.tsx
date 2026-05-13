'use client'

import { useEffect, useRef, useState } from 'react'
import type { CheckpointConversationTurn } from '@/types/domain'

interface Props {
  submissionId: string
  sectionIndex: number
  onComplete: (params: {
    conversation: CheckpointConversationTurn[]
    passed: boolean
    aiFeedback: string
  }) => void
  onError: (msg: string) => void
}

export function CheckpointVoiceScreen({ submissionId, sectionIndex, onComplete, onError }: Props) {
  const [status, setStatus] = useState<'connecting' | 'active' | 'ending'>('connecting')
  const [turns, setTurns] = useState<CheckpointConversationTurn[]>([])
  const sessionRef = useRef<{ close?: () => void } | null>(null)
  const turnsRef = useRef<CheckpointConversationTurn[]>([])

  useEffect(() => {
    turnsRef.current = turns
  }, [turns])

  useEffect(() => {
    let cancelled = false

    async function startSession() {
      try {
        // 1. Mint ephemeral client secret
        const res = await fetch(
          `/api/submissions/${submissionId}/checkpoint/${sectionIndex}/realtime-session`,
          { method: 'POST' }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(data.error ?? 'Failed to start voice session')
        }
        const { clientSecret } = await res.json() as { clientSecret: string }
        if (cancelled) return

        // 2. Dynamically import @openai/agents to avoid SSR issues
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { RealtimeAgent, RealtimeSession } = await import('@openai/agents/realtime' as any) as any

        const agent = new RealtimeAgent({ name: 'checkpoint-evaluator' })
        const session = new RealtimeSession(agent, { model: 'gpt-4o-realtime-preview' })
        sessionRef.current = session as unknown as { close?: () => void }

        // 3. Handle conversation updates
        session.on('conversation_updated', (event: unknown) => {
          const ev = event as { conversation?: Array<{ role?: string; content?: Array<{ transcript?: string }> }> }
          if (!ev.conversation) return
          const newTurns: CheckpointConversationTurn[] = ev.conversation
            .filter((item) => item.role === 'user' || item.role === 'assistant')
            .map((item) => ({
              role: (item.role === 'user' ? 'student' : 'ai') as 'student' | 'ai',
              text: item.content?.[0]?.transcript ?? '',
            }))
            .filter((t) => t.text.trim().length > 0)
          setTurns(newTurns)
        })

        // 4. Handle checkpoint_decision tool call
        session.on('tool_call', async (toolCall: unknown) => {
          const tc = toolCall as { name?: string; arguments?: string }
          if (tc.name !== 'checkpoint_decision') return
          const { passed, feedback } = JSON.parse(tc.arguments ?? '{}') as {
            passed?: boolean
            feedback?: string
          }
          setStatus('ending')
          if (typeof (session as { close?: () => void }).close === 'function') {
            (session as { close: () => void }).close()
          }
          onComplete({
            conversation: turnsRef.current,
            passed: Boolean(passed),
            aiFeedback: feedback ?? '',
          })
        })

        // 5. Connect via WebRTC
        await session.connect({ apiKey: clientSecret })
        if (cancelled) {
          if (typeof (session as { close?: () => void }).close === 'function') {
            (session as { close: () => void }).close()
          }
          return
        }
        setStatus('active')
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : 'Voice session failed')
        }
      }
    }

    startSession()
    return () => {
      cancelled = true
      if (sessionRef.current && typeof sessionRef.current.close === 'function') {
        sessionRef.current.close()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, sectionIndex])

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      {/* Status bar */}
      <div className="border-b border-[#E3E0D8] bg-white px-6 py-3 flex items-center gap-3">
        <div className={[
          'w-2.5 h-2.5 rounded-full shrink-0',
          status === 'connecting' ? 'bg-[#F59E0B] animate-pulse' : '',
          status === 'active' ? 'bg-[#10B981] animate-pulse' : '',
          status === 'ending' ? 'bg-[#6B7280]' : '',
        ].join(' ')} />
        <span className="text-sm text-[#374151]">
          {status === 'connecting' && 'Connecting to AI…'}
          {status === 'active' && 'Voice conversation active — speak naturally'}
          {status === 'ending' && 'Conversation ending…'}
        </span>
      </div>

      {/* Conversation transcript */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto w-full">
        {turns.length === 0 ? (
          <div className="text-center mt-16">
            <p className="text-sm text-[#8A8F98]">
              {status === 'connecting'
                ? 'Initializing voice session…'
                : 'The AI will begin speaking shortly. Respond naturally.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {turns.map((turn, i) => (
              <div
                key={i}
                className={['flex', turn.role === 'student' ? 'justify-end' : 'justify-start'].join(' ')}
              >
                <div className={[
                  'max-w-sm rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  turn.role === 'student'
                    ? 'bg-[#2563A6] text-white rounded-br-sm'
                    : 'bg-white border border-[#E3E0D8] text-[#18202A] rounded-bl-sm',
                ].join(' ')}>
                  {turn.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {status === 'active' && (
        <div className="border-t border-[#E3E0D8] bg-white p-4 text-center">
          <p className="text-xs text-[#8A8F98]">The AI controls when the checkpoint ends. Speak clearly and thoughtfully.</p>
        </div>
      )}
    </div>
  )
}
