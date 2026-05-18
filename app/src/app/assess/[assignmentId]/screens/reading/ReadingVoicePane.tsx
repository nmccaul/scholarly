'use client'

import { useEffect, useRef, useState } from 'react'
import { buildPassCriteriaPrompt } from '@/lib/ai/pass-criteria'
import type { CheckpointAction, CheckpointConversationTurn, CheckpointPassMode } from '@/types/domain'

type OrbState = 'connecting' | 'listening' | 'speaking' | 'paused' | 'ending' | 'passed' | 'force-unlocked'

interface Props {
  submissionId: string
  sectionIndex: number
  sectionTitle: string
  sectionContent: string
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
  isLastSection: boolean
  onCheckpointResolved: (newSectionIndex: number) => void
}

function buildInstructions(
  sectionTitle: string,
  sectionContent: string,
  passMode: CheckpointPassMode,
  actions: CheckpointAction[]
): string {
  return `You are an academic reading evaluator conducting a voice checkpoint.

The student has just finished reading the following section:

SECTION TITLE: ${sectionTitle}

SECTION CONTENT:
${sectionContent}

The section may be ANY kind of text — an argument-based essay, a poem, a news article, a primary source, a memoir, a textbook chapter. Do NOT require the student to identify or evaluate an "argument" unless the text actually makes one.

YOUR ROLE:
- Open with a brief, warm invitation — do NOT lead with a structured question. Say something like: "Go ahead and share anything about this section — what stood out, what you thought, or any questions you have."
- Listen carefully to what the student volunteers
- Ask follow-up questions that are specific and dynamic based on exactly what they said:
  - If they mention something that caught their attention, ask why it stood out
  - If they raise a question or confusion, explore it with them
  - If they summarize without interpreting, ask what they actually think of it
  - If they react vaguely, ask them to point to a specific moment in the text and explain
- Continue until you are confident they have demonstrated (or failed to demonstrate) what passes this checkpoint

${buildPassCriteriaPrompt(passMode, actions)}

When the student has met the passing criteria, call checkpoint_decision:
- passed: true if they met the criteria, false otherwise
- feedback: 1–2 sentences of constructive feedback for the student

Important: respond to whatever the student just said BEFORE calling checkpoint_decision, and never announce the pass. The student's UI shows the pass visually — your job is just to keep the conversation natural.

Do NOT call checkpoint_decision more than once.

Keep questions concise. This is a brief checkpoint, not an interrogation.`
}

export function ReadingVoicePane({
  submissionId,
  sectionIndex,
  sectionTitle,
  sectionContent,
  checkpointPassMode,
  checkpointActions,
  isLastSection,
  onCheckpointResolved,
}: Props) {
  const [orbState, setOrbState] = useState<OrbState>('connecting')
  const [paused, setPaused] = useState(false)
  const [turns, setTurns] = useState<CheckpointConversationTurn[]>([])
  // After a successful pass, the conversation continues until the student
  // clicks Continue. nextSectionIndex is captured at pass-time and used by
  // the button to advance.
  const [passedAndChatting, setPassedAndChatting] = useState(false)
  const [nextSectionIndex, setNextSectionIndex] = useState<number | null>(null)
  const sessionRef = useRef<{ close?: () => void; mute?: (m: boolean) => void; interrupt?: () => void } | null>(null)
  const prePauseStateRef = useRef<OrbState>('listening')
  const turnsRef = useRef<CheckpointConversationTurn[]>([])
  const resolvedRef = useRef(false)
  const onResolvedRef = useRef(onCheckpointResolved)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onResolvedRef.current = onCheckpointResolved
  })

  useEffect(() => {
    turnsRef.current = turns
  }, [turns])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  useEffect(() => {
    let cancelled = false

    async function startSession() {
      try {
        // 1. Mint ephemeral token from our server
        const res = await fetch(
          `/api/submissions/${submissionId}/checkpoint/${sectionIndex}/realtime-session`,
          { method: 'POST' }
        )
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? 'Failed to start voice session')
        }
        const { clientSecret } = (await res.json()) as { clientSecret: string }
        if (cancelled) return

        // 2. Dynamically import SDK (browser-only, avoids SSR)
        const [{ RealtimeAgent, RealtimeSession }, { tool }, { z }] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          import('@openai/agents/realtime') as Promise<any>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          import('@openai/agents') as Promise<any>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          import('zod') as Promise<any>,
        ])

        if (cancelled) return

        // 3. Define the checkpoint_decision tool — handler runs in browser when AI calls it
        const checkpointTool = tool({
          name: 'checkpoint_decision',
          description:
            'Call this exactly once when you have determined whether the student passed the checkpoint.',
          parameters: z.object({
            passed: z
              .boolean()
              .describe(
                'Whether the student demonstrated critical engagement at Analysis level or above'
              ),
            feedback: z
              .string()
              .describe('1–2 sentences of constructive feedback for the student'),
          }),
          execute: async ({
            passed,
            feedback,
          }: {
            passed: boolean
            feedback: string
          }) => {
            if (resolvedRef.current) return 'already resolved'
            resolvedRef.current = true

            // Record to server in the background — don't gate the UI on this.
            const recordResult = fetch(
              `/api/submissions/${submissionId}/checkpoint/${sectionIndex}/complete`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversation: turnsRef.current,
                  passed,
                  aiFeedback: feedback,
                }),
              }
            )
              .then((r) => r.json() as Promise<{ newSectionIndex?: number }>)
              .catch(() => ({ newSectionIndex: sectionIndex + 1 }))

            if (passed) {
              // Keep the session OPEN so the student can keep chatting.
              // The "Continue to next section" button advances them on click.
              const data = await recordResult
              const newIdx = data.newSectionIndex ?? sectionIndex + 1
              setNextSectionIndex(newIdx)
              setPassedAndChatting(true)
              setOrbState('passed')
              // Snap back to a normal listening/speaking state so the orb keeps
              // animating during the post-pass chat. The audio_start/audio_stopped
              // listeners below will keep it in sync.
              setOrbState('listening')
              return 'Checkpoint passed. Free conversation continues until the student clicks Continue.'
            }

            // Force-unlock path: close session and auto-advance after a beat.
            setOrbState('ending')
            if (typeof sessionRef.current?.close === 'function') {
              sessionRef.current.close()
            }
            try {
              const data = await recordResult
              const newIdx = data.newSectionIndex ?? sectionIndex + 1
              setOrbState('force-unlocked')
              setTimeout(() => onResolvedRef.current(newIdx), 3500)
            } catch {
              setOrbState('force-unlocked')
              setTimeout(() => onResolvedRef.current(sectionIndex + 1), 2500)
            }

            return 'Checkpoint decision recorded.'
          },
        })

        // 4. Create agent with instructions + tool
        const agent = new RealtimeAgent({
          name: 'checkpoint-evaluator',
          instructions: buildInstructions(sectionTitle, sectionContent, checkpointPassMode, checkpointActions),
          tools: [checkpointTool],
          voice: 'shimmer',
        })

        // 5. Create session — speed maxed at 1.5 (OpenAI's hard limit)
        const session = new RealtimeSession(agent, {
          model: 'gpt-realtime',
          config: { audio: { output: { speed: 1.3 } } },
        })
        sessionRef.current = session

        // 6. Live transcript via history_updated
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.on('history_updated', (history: any[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newTurns: CheckpointConversationTurn[] = history
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => item.type === 'message' && (item.role === 'user' || item.role === 'assistant'))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const content: any[] = item.content ?? []
              const text = content
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((c: any) => c.transcript ?? c.text ?? '')
                .filter(Boolean)
                .join(' ')
              return {
                role: (item.role === 'user' ? 'student' : 'ai') as 'student' | 'ai',
                text,
              }
            })
            .filter((t) => t.text.trim().length > 0)
          setTurns(newTurns)
        })

        // 7. Orb animation: distinguish AI speaking vs student's turn (skip if paused).
        // Stays active after a pass — the conversation continues until the
        // student clicks Continue.
        session.on('audio_start', () => {
          prePauseStateRef.current = 'speaking'
          setPaused((p) => {
            if (p) return p
            setOrbState((s) => (s === 'ending' || s === 'force-unlocked' ? s : 'speaking'))
            return p
          })
        })
        session.on('audio_stopped', () => {
          prePauseStateRef.current = 'listening'
          setPaused((p) => {
            if (p) return p
            setOrbState((s) => (s === 'ending' || s === 'force-unlocked' ? s : 'listening'))
            return p
          })
        })

        // 8. Connect via WebRTC
        await session.connect({ apiKey: clientSecret })
        if (cancelled) {
          session.close()
          return
        }
        setOrbState('listening')
      } catch (e) {
        if (!cancelled) {
          console.error('[ReadingVoicePane]', e)
          setOrbState('ending')
        }
      }
    }

    startSession()
    return () => {
      cancelled = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (sessionRef.current && typeof (sessionRef.current as any).close === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(sessionRef.current as any).close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, sectionIndex])

  // ─── Pause / resume ───────────────────────────────────────────────────────

  function togglePause() {
    if (resolvedRef.current) return
    const session = sessionRef.current
    setPaused((prev) => {
      const next = !prev
      if (next) {
        // Pausing: interrupt AI speech and mute mic
        if (typeof session?.interrupt === 'function') session.interrupt()
        if (typeof session?.mute === 'function') session.mute(true)
        setOrbState('paused')
      } else {
        // Resuming: unmute mic, restore previous orb state
        if (typeof session?.mute === 'function') session.mute(false)
        setOrbState(prePauseStateRef.current)
      }
      return next
    })
  }

  // ─── Continue / advance ──────────────────────────────────────────────────

  function handleContinue() {
    const next = nextSectionIndex ?? sectionIndex + 1
    if (typeof sessionRef.current?.interrupt === 'function') sessionRef.current.interrupt()
    if (typeof sessionRef.current?.close === 'function') sessionRef.current.close()
    setOrbState('ending')
    onResolvedRef.current(next)
  }

  // ─── Orb styling ──────────────────────────────────────────────────────────

  const orbGradient = passedAndChatting
    ? 'from-[#10B981] to-[#059669]'  // stays green during pass-and-chat
    : {
        connecting: 'from-[#F59E0B] to-[#D97706]',
        listening: 'from-[#2563A6] to-[#1E518B]',
        speaking: 'from-[#1D4ED8] to-[#2563A6]',
        paused: 'from-[#6B7280] to-[#4B5563]',
        ending: 'from-[#9CA3AF] to-[#6B7280]',
        passed: 'from-[#10B981] to-[#059669]',
        'force-unlocked': 'from-[#F59E0B] to-[#D97706]',
      }[orbState]

  const ringColor = passedAndChatting
    ? 'bg-[#10B981]'
    : {
        connecting: 'bg-[#F59E0B]',
        listening: 'bg-[#2563A6]',
        speaking: 'bg-[#1D4ED8]',
        paused: 'bg-[#6B7280]',
        ending: 'bg-[#9CA3AF]',
        passed: 'bg-[#10B981]',
        'force-unlocked': 'bg-[#F59E0B]',
      }[orbState]

  const showRings = orbState === 'speaking' || orbState === 'listening'

  const statusText = passedAndChatting
    ? orbState === 'speaking'
      ? 'Passed · AI is speaking'
      : orbState === 'paused'
      ? 'Passed · Session paused'
      : 'Passed · Keep chatting or click Continue'
    : {
        connecting: 'Starting voice session…',
        listening: 'Listening — speak your response',
        speaking: 'AI is speaking…',
        paused: 'Session paused',
        ending: 'Wrapping up…',
        passed: 'Checkpoint passed!',
        'force-unlocked': 'Section unlocked',
      }[orbState]

  const canPause = orbState === 'listening' || orbState === 'speaking' || orbState === 'paused'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#E3E0D8] bg-[#FAFAF8] shrink-0">
        <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
          Voice Checkpoint
        </div>
        <div className="text-xs text-[#8A8F98] mt-0.5">{statusText}</div>
      </div>

      {/* Orb */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center mb-8">
          {/* Expanding rings */}
          {showRings && (
            <>
              <div
                className={`absolute w-56 h-56 rounded-full ${ringColor} opacity-10 animate-ping`}
                style={{ animationDuration: orbState === 'speaking' ? '1.2s' : '2s' }}
              />
              <div
                className={`absolute w-40 h-40 rounded-full ${ringColor} opacity-15 animate-ping`}
                style={{
                  animationDuration: orbState === 'speaking' ? '1.2s' : '2s',
                  animationDelay: '0.4s',
                }}
              />
            </>
          )}

          {/* Pulse for non-ring states */}
          {!showRings && orbState !== 'ending' && (
            <div className={`absolute w-44 h-44 rounded-full ${ringColor} opacity-15 animate-pulse`} />
          )}

          {/* Core orb — clickable to pause/resume */}
          <div
            onClick={canPause ? togglePause : undefined}
            className={[
              `relative w-32 h-32 rounded-full bg-gradient-to-br ${orbGradient} flex items-center justify-center shadow-xl transition-all duration-700`,
              canPause ? 'cursor-pointer hover:brightness-110 active:scale-95' : '',
            ].join(' ')}
          >
            {orbState === 'ending' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : orbState === 'paused' ? (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-white">
                <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
              </svg>
            ) : orbState === 'passed' ? (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : orbState === 'force-unlocked' ? (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M12 9v4m0 4h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              /* Mic icon */
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-white">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
                <path
                  d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Resolution message */}
        {passedAndChatting ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#10B981]">Checkpoint passed</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-xs leading-relaxed">
              Keep talking with the AI if you want to dig in more, or click Continue below when you&apos;re ready.
            </p>
          </div>
        ) : orbState === 'passed' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#10B981]">Great critical thinking!</p>
          </div>
        )}
        {orbState === 'force-unlocked' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#F59E0B]">Section unlocked</p>
            <p className="text-xs text-[#6B7280] mt-1">Your engagement has been recorded. Continuing…</p>
          </div>
        )}
        {orbState === 'paused' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#6B7280]">Session paused</p>
            <p className="text-xs text-[#8A8F98] mt-1">Your microphone is muted. Resume when ready.</p>
          </div>
        )}
        {!passedAndChatting && (orbState === 'connecting' || orbState === 'listening' || orbState === 'speaking') && (
          <p className="text-sm text-[#374151] text-center max-w-xs leading-relaxed">
            {orbState === 'connecting'
              ? 'Connecting to AI…'
              : turns.filter(t => t.role === 'student').length === 0
              ? 'Share anything about the reading — a summary, something that stood out, or a question you have.'
              : 'Speak naturally.'}
          </p>
        )}

        {/* Tap hint — only shown briefly on first active state */}
        {!passedAndChatting && (orbState === 'listening' || orbState === 'speaking') && (
          <p className="mt-4 text-xs text-[#8A8F98]">Tap orb to pause</p>
        )}

        {/* Continue button — only after passing */}
        {passedAndChatting && (
          <button
            onClick={handleContinue}
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors shadow-sm"
          >
            {isLastSection ? 'Finish assignment' : 'Continue to next section'}
            <span aria-hidden>→</span>
          </button>
        )}
      </div>

      {/* Live transcript */}
      {turns.length > 0 && (
        <div className="border-t border-[#E3E0D8] max-h-52 overflow-y-auto shrink-0">
          <div className="px-5 py-3 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#8A8F98] mb-2">
              Transcript
            </div>
            {turns.map((turn, i) => (
              <div
                key={i}
                className={[
                  'flex text-xs',
                  turn.role === 'student' ? 'justify-end' : 'justify-start',
                ].join(' ')}
              >
                <div
                  className={[
                    'max-w-[80%] rounded-lg px-3 py-1.5',
                    turn.role === 'student'
                      ? 'bg-[#EEF4FF] text-[#1E3A5F]'
                      : 'bg-[#F0EEE8] text-[#374151]',
                  ].join(' ')}
                >
                  {turn.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}
