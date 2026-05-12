'use client'

import { useState, useEffect, useRef } from 'react'
import type { AssignmentId, SubmissionId } from '@/types/domain'
import type { SubmitResponse } from '@/types/api'

export type Screen =
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

export type FollowUpPhase = 'question' | 'recording' | 'processing'

export interface AssessmentConfig {
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}

function getRecordingMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
  if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

export function useAssessment(assignmentId: AssignmentId, config: AssessmentConfig) {
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
  useEffect(() => {
    if (
      (screen === 'record' || (screen === 'follow-up' && followUpPhase === 'recording')) &&
      videoRef.current &&
      streamRef.current &&
      config.cameraRequired
    ) {
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

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId }),
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
  // assignmentId and config are stable (SSR-derived); mutations go through refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enterRecordPhase() {
    if (enteringRecordRef.current) return
    enteringRecordRef.current = true
    clearTimer()

    try {
      const mimeType = getRecordingMimeType()
      if (!mimeType) {
        throw new Error(
          'Your browser does not support video/audio recording. Please use Chrome, Firefox, or Edge.'
        )
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

      // Upload to Supabase and send to Whisper simultaneously — don't wait for upload first
      const uploadPromise = fetch(url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeTypeRef.current },
      })
      const transcribeForm = new FormData()
      transcribeForm.append('audio', new File([blob], 'recording.webm', { type: mimeTypeRef.current }))
      const transcribeRes = await fetch(`/api/submissions/${sid}/transcribe`, {
        method: 'POST',
        body: transcribeForm,
      })
      if (!transcribeRes.ok) throw new Error('Transcription failed')
      const { transcript: t } = await transcribeRes.json()

      const uploadRes = await uploadPromise
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

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
      // Upload to Supabase and send to Whisper simultaneously
      const uploadPromise = fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeTypeRef.current },
      })
      const transcribeForm = new FormData()
      transcribeForm.append('audio', new File([blob], 'recording.webm', { type: mimeTypeRef.current }))
      const transcribeRes = await fetch(
        `/api/submissions/${sid}/follow-up/${index}/transcribe`,
        { method: 'POST', body: transcribeForm }
      )
      if (!transcribeRes.ok) throw new Error('Follow-up transcription failed')
      const { answerTranscript } = await transcribeRes.json()

      const uploadRes = await uploadPromise
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      const exchange = { question, answerTranscript }
      const updated = [...followUpExchangesRef.current, exchange]
      followUpExchangesRef.current = updated
      setFollowUpExchanges(updated)

      if (updated.length < config.followUpQuestionCount) {
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

  return {
    screen,
    errorMsg,
    secondsLeft,
    transcript,
    followUpPhase,
    followUpDisplayIndex,
    currentQuestion,
    followUpExchanges,
    gradeResult,
    resetting,
    videoRef,
    enterRecordPhase,
    stopMainRecording,
    enterFollowUpRecordPhase,
    stopFollowUpRecording,
    handleSubmit,
    handleReset,
  }
}
