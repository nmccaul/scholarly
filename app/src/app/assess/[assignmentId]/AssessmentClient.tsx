'use client'

import { useState, useEffect, useRef } from 'react'
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
  }, []) // assignment prop is stable (SSR); all mutation goes through refs — eslint-disable-line react-hooks/exhaustive-deps

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
        body: JSON.stringify({ transcript }),
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
          <div className="text-xl font-semibold text-gray-800 mb-2">Already Submitted</div>
          <div className="text-gray-500 text-sm mb-6">
            You&rsquo;ve already submitted this assignment.
          </div>
          <div className="flex flex-col gap-3">
            {isInstructor && (
              <button
                onClick={handleReset}
                disabled={resetting}
                className="block w-full px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Resetting…' : 'Try Again (Instructor Reset)'}
              </button>
            )}
            <a
              href={`/dashboard/${assignment.id}`}
              className="block px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Submissions
            </a>
            <a
              href="/dashboard"
              className="block px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Assignments
            </a>
          </div>
        </div>
      </Centered>
    )
  }

  if (screen === 'error') {
    return (
      <Centered>
        <div className="text-center max-w-sm">
          <div className="text-red-600 text-xl font-semibold mb-2">Something went wrong</div>
          <div className="text-gray-500 text-sm mb-6">{errorMsg}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
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
          <div className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4 text-center">
            Preparation Time
          </div>
          <div className="text-8xl font-bold text-gray-900 text-center mb-8 tabular-nums">
            {fmt(secondsLeft)}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Prompt
            </div>
            <p className="text-gray-800 text-base leading-relaxed">{config.prompt}</p>
          </div>
          <button
            onClick={enterRecordPhase}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
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
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">{fmt(secondsLeft)}</div>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-700 leading-relaxed">
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
            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
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
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4 text-center">
              Follow-up {followUpDisplayIndex + 1} of {config.followUpQuestionCount}
            </div>
            {currentQuestion ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                  <p className="text-gray-900 text-base leading-relaxed">{currentQuestion}</p>
                </div>
                <button
                  onClick={enterFollowUpRecordPhase}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-gray-800 leading-relaxed">
              {currentQuestion}
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Recording
              </div>
              <div className="text-2xl font-bold tabular-nums text-gray-900">{fmt(secondsLeft)}</div>
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
              className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Your Response</h1>
          <p className="text-sm text-gray-500 mb-8">Correct any transcription errors before submitting.</p>

          <label className="block text-sm font-semibold text-gray-700 mb-2">Your response</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            className="w-full border border-gray-300 rounded-xl p-4 text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 mb-8 resize-none"
          />

          {followUpExchanges.length > 0 && (
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-700 mb-3">Follow-up exchanges</div>
              <div className="space-y-3">
                {followUpExchanges.map((e, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="text-sm font-semibold text-blue-700 mb-1">Q: {e.question}</div>
                    <div className="text-sm text-gray-700">A: {e.answerTranscript}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Assessment Complete</h1>
          <p className="text-sm text-gray-500 mb-8">
            {syncStatus === 'success' && 'Your grade has been submitted to Canvas.'}
            {syncStatus === 'failed' && 'Your response was recorded, but the Canvas grade sync failed. Your instructor has been notified.'}
            {syncStatus === null && 'Your response has been recorded.'}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center mb-8">
            <div className="text-6xl font-bold text-gray-900 mb-1 tabular-nums">
              {finalGrade !== null ? finalGrade.toFixed(0) : '—'}
              <span className="text-3xl text-gray-400 font-normal"> / {pointsPossible}</span>
            </div>
            {pct !== null && <div className="text-lg text-gray-500 mt-1">{pct}%</div>}
          </div>

          {aiGradeRationale && (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Grade Breakdown</h2>
              <div className="space-y-3 mb-6">
                {aiGradeRationale.criteriaScores.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{s.label}</span>
                      <span className="text-sm text-gray-500 tabular-nums font-medium">
                        {s.score} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{s.rationale}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Overall Feedback
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">
                  {aiGradeRationale.overallFeedback}
                </p>
              </div>
            </>
          )}

          <div className="border-t border-gray-100 pt-8 flex flex-col gap-3">
            <a
              href={`/dashboard/${assignment.id}`}
              className="block w-full text-center py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              View Submissions
            </a>
            <a
              href="/dashboard"
              className="block w-full text-center py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              All Assignments
            </a>
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
      <div className="text-gray-500 text-base">{children}</div>
    </div>
  )
}
