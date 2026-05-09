'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { AssignmentId, SubmissionId } from '@/types/domain'
import type { SubmitResponse } from '@/types/api'

// Only the fields the client actually needs — sensitive server fields are stripped in page.tsx
export interface ClientAssignment {
  id: AssignmentId
  title: string
  pointsPossible: number
  config: {
    prompt: string
    preparationTimeSeconds: number
    maxResponseTimeSeconds: number
    followUpQuestionCount: number
    cameraRequired: boolean
  }
}

type Screen =
  | 'loading'
  | 'already-submitted'
  | 'prep'
  | 'record'
  | 'processing'
  | 'follow-up'
  | 'review'
  | 'grading'
  | 'result'
  | 'error'

type FollowUpPhase = 'question' | 'recording' | 'processing'

function getRecordingMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
  if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

export default function AssessmentClient({
  assignment,
  isInstructor = false,
}: {
  assignment: ClientAssignment
  isInstructor?: boolean
}) {
  const { config } = assignment

  const [screen, setScreen] = useState<Screen>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [followUpPhase, setFollowUpPhase] = useState<FollowUpPhase>('question')
  const [followUpDisplayIndex, setFollowUpDisplayIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [followUpExchanges, setFollowUpExchanges] = useState<
    Array<{ question: string; answerTranscript: string }>
  >([])
  const [gradeResult, setGradeResult] = useState<SubmitResponse | null>(null)
  const [resetting, setResetting] = useState(false)

  // Refs for values accessed inside async MediaRecorder callbacks (avoids stale closure bugs)
  const submissionIdRef = useRef<SubmissionId | null>(null)
  const uploadUrlRef = useRef<string | null>(null)
  const transcriptRef = useRef('')
  const followUpIndexRef = useRef(0)
  const currentQuestionRef = useRef<string | null>(null)
  const followUpUploadUrlRef = useRef<string | null>(null)
  const followUpExchangesRef = useRef<Array<{ question: string; answerTranscript: string }>>([])
  const mimeTypeRef = useRef('')
  // Prevents double-entry when both the prep timer and the button fire concurrently
  const enteringRecordRef = useRef(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Attach live stream to video element whenever the recording screen becomes active.
  // The video element only mounts after setScreen('record'), so we can't set srcObject
  // inline in enterRecordPhase — it must wait for the DOM to be ready.
  useEffect(() => {
    if ((screen === 'record' || (screen === 'follow-up' && followUpPhase === 'recording'))
        && videoRef.current && streamRef.current && config.cameraRequired) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [screen, followUpPhase, config.cameraRequired])

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function fail(message: string) {
    clearTimer()
    stopStream()
    setErrorMsg(message)
    setScreen('error')
  }

  function startTimer(seconds: number, onExpire: () => void) {
    clearTimer()
    setSecondsLeft(seconds)
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          onExpire()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // Initialize: create or find submission
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId: assignment.id }),
        })
        if (!res.ok) throw new Error(`Failed to initialize: ${res.status}`)
        const data = await res.json()
        submissionIdRef.current = data.submissionId
        uploadUrlRef.current = data.uploadUrl

        if (data.alreadySubmitted) {
          setScreen('already-submitted')
          return
        }

        if (config.preparationTimeSeconds > 0) {
          setScreen('prep')
          startTimer(config.preparationTimeSeconds, () => enterRecordPhase())
        } else {
          await enterRecordPhase()
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Failed to initialize')
      }
    })()

    return () => {
      clearTimer()
      stopStream()
    }
  // assignment prop is stable (SSR); all mutation goes through refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enterRecordPhase() {
    if (enteringRecordRef.current) return
    enteringRecordRef.current = true
    clearTimer()

    try {
      const mimeType = getRecordingMimeType()
      if (!mimeType) {
        throw new Error('Your browser does not support video/audio recording. Please use Chrome, Firefox, or Edge.')
      }
      mimeTypeRef.current = mimeType

      const stream = await navigator.mediaDevices.getUserMedia({
        video: config.cameraRequired,
        audio: true,
      })
      streamRef.current = stream
      setScreen('record')
      beginRecording(stream)
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Could not access microphone/camera')
    } finally {
      enteringRecordRef.current = false
    }
  }

  function beginRecording(stream: MediaStream) {
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = onMainRecordingStop
    recorder.start(1000)
    recorderRef.current = recorder
    startTimer(config.maxResponseTimeSeconds, () => {
      recorderRef.current?.stop()
      stopStream()
    })
  }

  function stopMainRecording() {
    clearTimer()
    recorderRef.current?.stop()
    stopStream()
  }

  async function onMainRecordingStop() {
    setScreen('processing')
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
    const sid = submissionIdRef.current
    const url = uploadUrlRef.current

    try {
      if (!sid || !url) throw new Error('Missing upload context')

      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeTypeRef.current },
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      const transcribeRes = await fetch(`/api/submissions/${sid}/transcribe`, { method: 'POST' })
      if (!transcribeRes.ok) throw new Error('Transcription failed')
      const { transcript: t } = await transcribeRes.json()

      transcriptRef.current = t
      setTranscript(t)

      if (config.followUpQuestionCount > 0) {
        followUpExchangesRef.current = []
        setFollowUpExchanges([])
        await fetchFollowUpQuestion(sid)
      } else {
        setScreen('review')
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Processing failed')
    }
  }

  async function fetchFollowUpQuestion(sid: SubmissionId) {
    setCurrentQuestion(null)
    setFollowUpPhase('question')
    setScreen('follow-up')

    try {
      const res = await fetch(`/api/submissions/${sid}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to generate follow-up question')
      const data = await res.json()

      // Use the server-returned index — the server owns this (derived from DB append position)
      followUpIndexRef.current = data.questionIndex
      setFollowUpDisplayIndex(data.questionIndex)
      currentQuestionRef.current = data.question
      followUpUploadUrlRef.current = data.uploadUrl
      setCurrentQuestion(data.question)
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Failed to generate follow-up question')
    }
  }

  async function enterFollowUpRecordPhase() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: config.cameraRequired,
        audio: true,
      })
      streamRef.current = stream
      setFollowUpPhase('recording')
      beginFollowUpRecording(stream)
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Could not access microphone/camera')
    }
  }

  function beginFollowUpRecording(stream: MediaStream) {
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = onFollowUpRecordingStop
    recorder.start(1000)
    recorderRef.current = recorder
    startTimer(config.maxResponseTimeSeconds, () => {
      recorderRef.current?.stop()
      stopStream()
    })
  }

  function stopFollowUpRecording() {
    clearTimer()
    recorderRef.current?.stop()
    stopStream()
  }

  async function onFollowUpRecordingStop() {
    setFollowUpPhase('processing')
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
    const sid = submissionIdRef.current
    const uploadUrl = followUpUploadUrlRef.current
    const question = currentQuestionRef.current
    const index = followUpIndexRef.current

    if (!sid || !uploadUrl || !question) {
      fail('Missing follow-up upload context')
      return
    }

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeTypeRef.current },
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      const transcribeRes = await fetch(
        `/api/submissions/${sid}/follow-up/${index}/transcribe`,
        { method: 'POST' }
      )
      if (!transcribeRes.ok) throw new Error('Follow-up transcription failed')
      const { answerTranscript } = await transcribeRes.json()

      const exchange = { question, answerTranscript }
      const updated = [...followUpExchangesRef.current, exchange]
      followUpExchangesRef.current = updated
      setFollowUpExchanges(updated)

      const completedCount = updated.length
      if (completedCount < config.followUpQuestionCount) {
        await fetchFollowUpQuestion(sid)
      } else {
        setScreen('review')
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Follow-up processing failed')
    }
  }

  async function handleSubmit() {
    const sid = submissionIdRef.current
    if (!sid) return
    setScreen('grading')
    try {
      const res = await fetch(`/api/submissions/${sid}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
      const data: SubmitResponse = await res.json()
      setGradeResult(data)
      setScreen('result')
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Submission failed')
    }
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  // ── Screens ──────────────────────────────────────────────────────────────────

  if (screen === 'loading') return <Centered>Preparing your assessment…</Centered>

  if (screen === 'already-submitted') {
    async function handleReset() {
      const sid = submissionIdRef.current
      if (!sid) return
      setResetting(true)
      try {
        const res = await fetch(`/api/submissions/${sid}/reset`, { method: 'POST' })
        if (!res.ok) throw new Error('Reset failed')
        window.location.reload()
      } catch {
        setResetting(false)
        fail('Could not reset submission. Please try again.')
      }
    }

    return (
      <Centered>
        <div className="text-center max-w-sm">
          <div className="text-xl font-semibold text-[#24313F] mb-2">Already Submitted</div>
          <div className="text-[#6B7280] text-sm mb-6">
            You&rsquo;ve already submitted this assignment.
          </div>
          <div className="flex flex-col gap-3">
            {isInstructor && (
              <button
                onClick={handleReset}
                disabled={resetting}
                className="block w-full px-5 py-2.5 bg-[#2563A6] text-white text-sm font-semibold rounded-lg hover:bg-[#1E518B] disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Resetting…' : 'Try Again (Instructor Reset)'}
              </button>
            )}
            <Link
              href={`/dashboard/${assignment.id}`}
              className="block px-5 py-2.5 border border-[#E3E0D8] text-[#374151] text-sm font-semibold rounded-lg hover:bg-[#FAF9F6] transition-colors"
            >
              View Submissions
            </Link>
            <Link
              href="/dashboard"
              className="block px-5 py-2.5 border border-[#E3E0D8] text-[#374151] text-sm font-semibold rounded-lg hover:bg-[#FAF9F6] transition-colors"
            >
              All Assignments
            </Link>
          </div>
        </div>
      </Centered>
    )
  }

  if (screen === 'error') {
    return (
      <Centered>
        <div className="text-center max-w-sm">
          <div className="text-[#2563A6] text-xl font-semibold mb-2">Something went wrong</div>
          <div className="text-[#6B7280] text-sm mb-6">{errorMsg}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2563A6] text-white rounded-lg text-sm hover:bg-[#1E518B]"
          >
            Try Again
          </button>
        </div>
      </Centered>
    )
  }

  if (screen === 'prep') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-xl">
          <div className="text-sm font-semibold text-[#2563A6] uppercase tracking-widest mb-4 text-center">
            Preparation Time
          </div>
          <div className="text-8xl font-bold text-[#18202A] text-center mb-8 tabular-nums">
            {fmt(secondsLeft)}
          </div>
          <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl p-6 mb-8">
            <div className="text-xs font-semibold text-[#8A8F98] uppercase tracking-wide mb-2">
              Prompt
            </div>
            <p className="text-[#24313F] text-base leading-relaxed">{config.prompt}</p>
          </div>
          <button
            onClick={enterRecordPhase}
            className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
          >
            Start Recording Now
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'record') {
    const pct = config.maxResponseTimeSeconds > 0
      ? (secondsLeft / config.maxResponseTimeSeconds) * 100
      : 0
    return (
      <div className="flex flex-col items-center min-h-screen p-8">
        <div className="w-full max-w-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2563A6]">
              <span className="w-2 h-2 rounded-full bg-[#C2413A] animate-pulse" />
              Recording
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#18202A]">{fmt(secondsLeft)}</div>
          </div>
          <div className="h-1.5 bg-[#E3E0D8] rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-[#C2413A] rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl p-4 mb-6 text-sm text-[#374151] leading-relaxed">
            {config.prompt}
          </div>
          {config.cameraRequired && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl bg-black mb-6 aspect-video object-cover"
            />
          )}
          <button
            onClick={stopMainRecording}
            className="w-full py-3 bg-[#24313F] text-white font-semibold rounded-xl hover:bg-[#18202A] transition-colors"
          >
            Finish Recording
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'processing') {
    return <Centered>Processing your response… this may take a moment.</Centered>
  }

  if (screen === 'follow-up') {
    if (followUpPhase === 'question') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="w-full max-w-xl">
            <div className="text-sm font-semibold text-[#2563A6] uppercase tracking-widest mb-4 text-center">
              Follow-up {followUpDisplayIndex + 1} of {config.followUpQuestionCount}
            </div>
            {currentQuestion ? (
              <>
                <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl p-6 mb-8">
                  <p className="text-[#18202A] text-base leading-relaxed">{currentQuestion}</p>
                </div>
                <button
                  onClick={enterFollowUpRecordPhase}
                  className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
                >
                  Record Your Answer
                </button>
              </>
            ) : (
              <Centered>Generating question…</Centered>
            )}
          </div>
        </div>
      )
    }

    if (followUpPhase === 'recording') {
      return (
        <div className="flex flex-col items-center min-h-screen p-8">
          <div className="w-full max-w-xl">
            <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl p-4 mb-6 text-sm text-[#24313F] leading-relaxed">
              {currentQuestion}
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2563A6]">
                <span className="w-2 h-2 rounded-full bg-[#C2413A] animate-pulse" />
                Recording
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#18202A]">{fmt(secondsLeft)}</div>
            </div>
            {config.cameraRequired && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-xl bg-black mb-6 aspect-video object-cover"
              />
            )}
            <button
              onClick={stopFollowUpRecording}
              className="w-full py-3 bg-[#24313F] text-white font-semibold rounded-xl hover:bg-[#18202A] transition-colors"
            >
              Finish Recording
            </button>
          </div>
        </div>
      )
    }

    return <Centered>Processing your answer…</Centered>
  }

  if (screen === 'review') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-[#18202A] mb-1">Review Your Response</h1>
          <p className="text-sm text-[#6B7280] mb-8">Review the transcript generated from your recording before submitting.</p>

          <label className="block text-sm font-semibold text-[#374151] mb-2">Your response</label>
          <div className="mb-8 min-h-40 whitespace-pre-wrap rounded-xl border border-[#D4CEC3] bg-[#FAF9F6] p-4 text-sm leading-relaxed text-[#18202A]">
            {transcript || 'No transcript was generated.'}
          </div>

          {followUpExchanges.length > 0 && (
            <div className="mb-8">
              <div className="text-sm font-semibold text-[#374151] mb-3">Follow-up exchanges</div>
              <div className="space-y-3">
                {followUpExchanges.map((e, i) => (
                  <div key={i} className="border border-[#E3E0D8] rounded-xl p-4">
                    <div className="text-sm font-semibold text-[#2563A6] mb-1">Q: {e.question}</div>
                    <div className="text-sm text-[#374151]">A: {e.answerTranscript}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
          >
            Submit for Grading
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'grading') {
    return <Centered>Grading your submission… this may take a moment.</Centered>
  }

  if (screen === 'result' && gradeResult) {
    const { finalGrade, pointsPossible, aiGradeRationale, syncStatus } = gradeResult
    const pct =
      finalGrade !== null && pointsPossible > 0
        ? Math.round((finalGrade / pointsPossible) * 100)
        : null

    return (
      <div className="min-h-screen p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-[#18202A] mb-1">Assessment Complete</h1>
          <p className="text-sm text-[#6B7280] mb-8">
            {syncStatus === 'success' && 'Your grade has been submitted to Canvas.'}
            {syncStatus === 'failed' && 'Your response was recorded, but the Canvas grade sync failed. Your instructor has been notified.'}
            {syncStatus === null && 'Your response has been recorded.'}
          </p>

          <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-2xl p-8 text-center mb-8">
            <div className="text-6xl font-bold text-[#18202A] mb-1 tabular-nums">
              {finalGrade !== null ? finalGrade.toFixed(0) : '—'}
              <span className="text-3xl text-[#8A8F98] font-normal"> / {pointsPossible}</span>
            </div>
            {pct !== null && <div className="text-lg text-[#6B7280] mt-1">{pct}%</div>}
          </div>

          {aiGradeRationale && (
            <>
              <h2 className="text-base font-semibold text-[#18202A] mb-4">Grade Breakdown</h2>
              <div className="space-y-3 mb-6">
                {aiGradeRationale.criteriaScores.map((s, i) => (
                  <div key={i} className="border border-[#E3E0D8] rounded-xl p-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-[#18202A] text-sm">{s.label}</span>
                      <span className="text-sm text-[#6B7280] tabular-nums font-medium">
                        {s.score} pts
                      </span>
                    </div>
                    <p className="text-sm text-[#6B7280]">{s.rationale}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#FAF9F6] border border-[#E3E0D8] rounded-xl p-4 mb-8">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                  Overall Feedback
                </div>
                <p className="text-sm text-[#24313F] leading-relaxed">
                  {aiGradeRationale.overallFeedback}
                </p>
              </div>
            </>
          )}

          <div className="border-t border-[#EEEAE2] pt-8 flex flex-col gap-3">
            <Link
              href={`/dashboard/${assignment.id}`}
              className="block w-full text-center py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors text-sm"
            >
              View Submissions
            </Link>
            <Link
              href="/dashboard"
              className="block w-full text-center py-3 border border-[#E3E0D8] text-[#374151] font-semibold rounded-xl hover:bg-[#FAF9F6] transition-colors text-sm"
            >
              All Assignments
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-[#6B7280] text-base">{children}</div>
    </div>
  )
}
