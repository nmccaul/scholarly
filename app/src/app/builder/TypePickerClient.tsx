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

function AssignmentIcon({ id, className }: { id: string; className?: string }) {
  const props = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (id) {
    case 'oral_assessment':
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M19 11a7 7 0 0 1-14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="9" y1="22" x2="15" y2="22" />
        </svg>
      )
    case 'socratic_seminar':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'concept_explanation':
      return (
        <svg {...props}>
          <line x1="9" y1="18" x2="15" y2="18" />
          <line x1="10" y1="22" x2="14" y2="22" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
      )
    case 'ai_debate':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'research_audit':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'adaptive_quiz':
      return (
        <svg {...props}>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      )
    case 'process_narration':
      return (
        <svg {...props}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )
    case 'peer_review_sim':
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    default:
      return null
  }
}

export default function TypePickerClient({
  returnUrl,
  dlData,
  isDemo = false,
  initialRequested = [],
}: {
  returnUrl: string
  dlData?: string
  isDemo?: boolean
  initialRequested?: string[]
}) {
  const router = useRouter()
  const [requested, setRequested] = useState<Set<string>>(new Set(initialRequested))
  const [requesting, setRequesting] = useState<string | null>(null)
  const [unrequesting, setUnrequesting] = useState<string | null>(null)

  function buildOralAssessmentUrl() {
    if (isDemo) return '/builder/new'
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
    <div className="px-6 py-10">
      <div className="max-w-4xl">

        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-bold tracking-tight">S</div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">New Assignment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose the type of AI-powered assignment you want to create.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ASSIGNMENT_TYPES.map((type) => (
            type.available ? (
              <div
                key={type.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col"
              >
                <div className="h-0.5 bg-gradient-to-r from-red-600 via-red-400 to-transparent" />
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <AssignmentIcon id={type.id} className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-red-600 uppercase tracking-widest mt-1">
                      Available
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-900 leading-snug mb-1.5">{type.label}</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">{type.description}</p>
                  </div>
                  <button
                    onClick={() => router.push(buildOralAssessmentUrl())}
                    className="w-full py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={type.id}
                className="rounded-2xl border border-dashed border-slate-200 bg-white/50 flex flex-col"
              >
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <AssignmentIcon id={type.id} className="w-4 h-4 text-slate-300" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-widest mt-1">
                      Soon
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-medium text-slate-400 leading-snug mb-1.5">{type.label}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">{type.description}</p>
                  </div>
                  {requested.has(type.id) ? (
                    <button
                      onClick={() => handleUnrequest(type.id)}
                      disabled={unrequesting === type.id}
                      className="group w-full py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-60 disabled:cursor-default border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
                      className="w-full py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-default transition-colors"
                    >
                      {requesting === type.id ? 'Requesting…' : 'Request this type'}
                    </button>
                  )}
                </div>
              </div>
            )
          ))}
        </div>

      </div>
    </div>
  )
}
