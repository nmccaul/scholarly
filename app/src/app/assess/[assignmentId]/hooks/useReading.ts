'use client'

import { useState, useCallback, useRef } from 'react'
import type { AssignmentId, ReadingSection, RubricCriterion } from '@/types/domain'
import type { CreateSubmissionResponse, SubmitResponse } from '@/types/api'

export type ReadingScreen =
  | 'loading'
  | 'already-submitted'
  | 'reading'
  | 'all-sections-complete'
  | 'grading'
  | 'result'
  | 'error'

interface ReadingConfig {
  sections: ReadingSection[]
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterion[]
}

export function useReading(assignmentId: AssignmentId, config: ReadingConfig) {
  const [screen, setScreen] = useState<ReadingScreen>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [gradeResult, setGradeResult] = useState<SubmitResponse | null>(null)
  const [resetting, setResetting] = useState(false)
  const submissionIdRef = useRef<string | null>(null)

  const totalSections = config.sections.length
  const currentSection = config.sections[currentSectionIndex] ?? null

  const init = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      const data: CreateSubmissionResponse & { error?: string } = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to start assignment')
        setScreen('error')
        return
      }
      submissionIdRef.current = data.submissionId
      setSubmissionId(data.submissionId)

      if (data.alreadySubmitted) {
        setScreen('already-submitted')
        return
      }

      const resumeIndex = data.currentSectionIndex ?? 0
      setCurrentSectionIndex(resumeIndex)
      setScreen('reading')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setScreen('error')
    }
  }, [assignmentId])

  const startInit = init

  // Called by ReadingChatPane / ReadingVoicePane when a checkpoint resolves
  function onCheckpointResolved(newSectionIndex: number) {
    if (newSectionIndex >= totalSections) {
      setScreen('all-sections-complete')
    } else {
      setCurrentSectionIndex(newSectionIndex)
      // Screen stays 'reading' — left pane updates to show new section
    }
  }

  async function onConfirmSubmit() {
    const sid = submissionIdRef.current
    if (!sid) return
    setScreen('grading')

    try {
      const res = await fetch(`/api/submissions/${sid}/reading-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data: SubmitResponse & { error?: string } = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Grading failed. Please try again.')
        setScreen('error')
        return
      }
      setGradeResult(data)
      setScreen('result')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setScreen('error')
    }
  }

  async function handleReset() {
    const sid = submissionIdRef.current
    if (!sid) return
    setResetting(true)
    try {
      const res = await fetch(`/api/submissions/${sid}/reset`, { method: 'POST' })
      if (res.ok) {
        setCurrentSectionIndex(0)
        setGradeResult(null)
        setScreen('reading')
      }
    } finally {
      setResetting(false)
    }
  }

  return {
    screen,
    errorMsg,
    submissionId,
    currentSectionIndex,
    totalSections,
    currentSection,
    gradeResult,
    resetting,
    startInit,
    onCheckpointResolved,
    onConfirmSubmit,
    handleReset,
  }
}
