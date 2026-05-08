'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AssignmentType {
  id: string
  label: string
  description: string
  available: boolean
}

const ASSIGNMENT_TYPES: AssignmentType[] = [
  {
    id: 'oral_assessment',
    label: 'Oral Assessment',
    description: 'Student speaks a response; AI transcribes, asks follow-up questions, and grades against a rubric.',
    available: true,
  },
  {
    id: 'socratic_seminar',
    label: 'Socratic Seminar Simulation',
    description: "AI plays devil's advocate; student defends a position through dialogue.",
    available: false,
  },
  {
    id: 'concept_explanation',
    label: 'Concept Explanation Challenge',
    description: '"Explain this to a 5-year-old" — tests depth of understanding through simplification.',
    available: false,
  },
  {
    id: 'ai_debate',
    label: 'AI Debate Partner',
    description: 'Student debates a topic against an AI opponent that argues the other side.',
    available: false,
  },
  {
    id: 'research_audit',
    label: 'Research Validity Audit',
    description: 'Student evaluates AI-generated sources for credibility and academic validity.',
    available: false,
  },
  {
    id: 'adaptive_quiz',
    label: 'Adaptive Reading Quiz',
    description: 'AI generates questions from teacher-uploaded text; adapts based on student answers.',
    available: false,
  },
  {
    id: 'process_narration',
    label: 'Process Narration',
    description: 'Student narrates their problem-solving process while working through a problem.',
    available: false,
  },
  {
    id: 'peer_review_sim',
    label: 'Peer Review Simulation',
    description: 'AI plays the role of a peer submitting work for the student to review and critique.',
    available: false,
  },
]

export default function TypePickerClient({
  returnUrl,
  dlData,
  initialRequested = [],
}: {
  returnUrl: string
  dlData?: string
  initialRequested?: string[]
}) {
  const router = useRouter()
  const [requested, setRequested] = useState<Set<string>>(new Set(initialRequested))
  const [requesting, setRequesting] = useState<string | null>(null)
  const [unrequesting, setUnrequesting] = useState<string | null>(null)

  function buildOralAssessmentUrl() {
    const params = new URLSearchParams({ return_url: returnUrl })
    if (dlData) params.set('dl_data', dlData)
    return `/builder/new?${params.toString()}`
  }

  async function handleRequest(typeId: string) {
    if (requested.has(typeId) || requesting === typeId) return
    setRequesting(typeId)
    try {
      await fetch('/api/assignment-type-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentType: typeId }),
      })
      setRequested((prev) => new Set([...prev, typeId]))
    } finally {
      setRequesting(null)
    }
  }

  async function handleUnrequest(typeId: string) {
    if (!requested.has(typeId) || unrequesting === typeId) return
    setUnrequesting(typeId)
    try {
      await fetch('/api/assignment-type-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentType: typeId }),
      })
      setRequested((prev) => {
        const next = new Set(prev)
        next.delete(typeId)
        return next
      })
    } finally {
      setUnrequesting(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <div className="mb-8">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Scholarly
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Choose an Assignment Type</h1>
          <p className="text-sm text-slate-500 mt-1">
            Select the type of AI-powered assignment you want to create.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ASSIGNMENT_TYPES.map((type) => (
            <div
              key={type.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 leading-snug">{type.label}</h2>
                {type.available ? (
                  <span className="shrink-0 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                    Available
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Coming Soon
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed flex-1">{type.description}</p>

              {type.available ? (
                <button
                  onClick={() => router.push(buildOralAssessmentUrl())}
                  className="w-full py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              ) : requested.has(type.id) ? (
                <button
                  onClick={() => handleUnrequest(type.id)}
                  disabled={unrequesting === type.id}
                  className="group w-full py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-60 disabled:cursor-default border-green-200 bg-green-50 text-green-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <span className="group-hover:hidden">
                    {unrequesting === type.id ? 'Removing…' : 'Requested ✓'}
                  </span>
                  <span className="hidden group-hover:inline">Remove request</span>
                </button>
              ) : (
                <button
                  onClick={() => handleRequest(type.id)}
                  disabled={requesting === type.id}
                  className="w-full py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-default transition-colors"
                >
                  {requesting === type.id ? 'Requesting…' : 'Request this type'}
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
