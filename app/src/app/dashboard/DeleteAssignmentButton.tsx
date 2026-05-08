'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-slate-500">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
      aria-label="Delete assignment"
    >
      ×
    </button>
  )
}
