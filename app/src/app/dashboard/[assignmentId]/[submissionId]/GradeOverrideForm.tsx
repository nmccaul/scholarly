'use client'

import { useState } from 'react'
import type { GradeOverrideResponse } from '@/types/api'

interface Props {
  submissionId: string
  currentFinalGrade: number | null
  currentFeedback: string | null
  pointsPossible: number
  syncStatus: 'pending' | 'success' | 'failed' | null
}

export default function GradeOverrideForm({
  submissionId,
  currentFinalGrade,
  currentFeedback,
  pointsPossible,
  syncStatus: initialSyncStatus,
}: Props) {
  const [grade, setGrade] = useState(currentFinalGrade?.toString() ?? '')
  const [feedback, setFeedback] = useState(currentFeedback ?? '')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<GradeOverrideResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState(initialSyncStatus)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(grade)
    if (isNaN(parsed) || parsed < 0 || parsed > pointsPossible) {
      setError(`Grade must be between 0 and ${pointsPossible}`)
      return
    }

    setSaving(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalGrade: parsed, teacherFeedback: feedback.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Request failed: ${res.status}`)
      }
      const data: GradeOverrideResponse = await res.json()
      setResult(data)
      setSyncStatus(data.syncStatus)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Final Grade
          <span className="ml-1 font-normal text-slate-400">/ {pointsPossible}</span>
        </label>
        <input
          type="number"
          min={0}
          max={pointsPossible}
          step={0.5}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Feedback <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="Add feedback for the student…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-600 font-medium">Saved.</span>
          {result.syncStatus === 'success' && (
            <span className="text-green-600">Grade synced to Canvas.</span>
          )}
          {result.syncStatus === 'failed' && (
            <span className="text-red-600">Canvas sync failed — check sync log.</span>
          )}
          {result.syncStatus === null && (
            <span className="text-slate-400">No Canvas sync (no lineitem URL).</span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving…' : 'Save & Sync to Canvas'}
      </button>

      {syncStatus === 'failed' && !result && (
        <p className="text-xs text-red-500 mt-1">
          Previous Canvas sync failed. Saving will attempt to re-sync.
        </p>
      )}
    </form>
  )
}
