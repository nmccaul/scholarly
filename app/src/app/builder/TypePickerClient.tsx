'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AssignmentType {
  id: string
  label: string
  description: string
  available: boolean
}

interface AiRole {
  id: string
  label: string
  definition: string
  types: AssignmentType[]
}

const AI_ROLES: AiRole[] = [
  {
    id: 'no_ai',
    label: 'No AI',
    definition: 'The assignment is completed entirely without AI assistance. Students demonstrate knowledge and skills independently.',
    types: [
      {
        id: 'oral_assessment',
        label: 'Oral Assessment',
        description: 'Student speaks a response; AI transcribes, asks follow-up questions, and grades against a rubric.',
        available: true,
      },
    ],
  },
  {
    id: 'tutor',
    label: 'AI as Tutor',
    definition: 'AI provides direct, personalized instruction and explanations — adapting to what each student knows and where they struggle.',
    types: [
      {
        id: 'adaptive_quiz',
        label: 'Adaptive Reading Quiz',
        description: 'AI generates questions from teacher-uploaded text; adapts based on student answers.',
        available: false,
      },
    ],
  },
  {
    id: 'coach',
    label: 'AI as Coach',
    definition: 'AI prompts metacognition — helping students reflect on their process, regulate their thinking, and improve their approach.',
    types: [
      {
        id: 'peer_review_sim',
        label: 'Peer Review Simulation',
        description: 'AI plays the role of a peer submitting work for the student to review and critique.',
        available: false,
      },
    ],
  },
  {
    id: 'mentor',
    label: 'AI as Mentor',
    definition: 'AI provides ongoing formative feedback during the learning process, guiding students toward improvement over time.',
    types: [
      {
        id: 'process_narration',
        label: 'Process Narration',
        description: 'Student narrates their problem-solving process while working through a problem.',
        available: false,
      },
    ],
  },
  {
    id: 'teammate',
    label: 'AI as Teammate',
    definition: 'AI collaborates with the student as a partner, contributing to a shared task and offering alternate viewpoints.',
    types: [
      {
        id: 'ai_debate',
        label: 'AI Debate Partner',
        description: 'Student debates a topic against an AI opponent that argues the other side.',
        available: false,
      },
    ],
  },
  {
    id: 'student',
    label: 'AI as Student',
    definition: 'The student teaches or explains to the AI — reinforcing their own understanding through the act of teaching.',
    types: [
      {
        id: 'concept_explanation',
        label: 'Concept Explanation Challenge',
        description: '"Explain this to a 5-year-old" — tests depth of understanding through simplification.',
        available: false,
      },
    ],
  },
  {
    id: 'simulator',
    label: 'AI as Simulator',
    definition: 'AI creates realistic scenarios, role-plays, or practice environments for deliberate skill development and transfer.',
    types: [
      {
        id: 'socratic_seminar',
        label: 'Socratic Seminar Simulation',
        description: "AI plays devil's advocate; student defends a position through dialogue.",
        available: false,
      },
    ],
  },
  {
    id: 'tool',
    label: 'AI as Tool',
    definition: 'AI is used instrumentally for specific subtasks — helping students work more efficiently while keeping the thinking theirs.',
    types: [
      {
        id: 'research_audit',
        label: 'Research Validity Audit',
        description: 'Student evaluates AI-generated sources for credibility and academic validity.',
        available: false,
      },
    ],
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
  const [loading, setLoading] = useState<Record<string, 'requesting' | 'unrequesting'>>({})

  function buildOralAssessmentUrl() {
    if (isDemo) return '/builder/new'
    const params = new URLSearchParams({ return_url: returnUrl })
    if (dlData) params.set('dl_data', dlData)
    return `/builder/new?${params.toString()}`
  }

  async function handleRequest(typeId: string) {
    if (requested.has(typeId) || loading[typeId]) return
    setLoading((prev) => ({ ...prev, [typeId]: 'requesting' }))
    try {
      const res = await fetch('/api/assignment-type-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentType: typeId }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      setRequested((prev) => new Set([...prev, typeId]))
    } catch (e) {
      console.error('Failed to request assignment type:', e)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading((prev) => { const next = { ...prev }; delete next[typeId]; return next })
    }
  }

  async function handleUnrequest(typeId: string) {
    if (!requested.has(typeId) || loading[typeId]) return
    setLoading((prev) => ({ ...prev, [typeId]: 'unrequesting' }))
    try {
      const res = await fetch('/api/assignment-type-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentType: typeId }),
      })
      if (!res.ok) throw new Error(`Unrequest failed: ${res.status}`)
      setRequested((prev) => {
        const next = new Set(prev)
        next.delete(typeId)
        return next
      })
    } catch (e) {
      console.error('Failed to remove assignment type request:', e)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading((prev) => { const next = { ...prev }; delete next[typeId]; return next })
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="max-w-5xl">

        <div className="mb-10">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Assignment registry
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">New Assignment</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Every assignment type is designed around a specific role for AI in learning.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {AI_ROLES.map((role) => (
            <div key={role.id}>
              {/* Role header */}
              <div className="mb-4 pb-3 border-b border-[#E3E0D8]">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-sm font-semibold text-[#18202A]">{role.label}</h2>
                  <span className="text-xs text-[#8A8F98]">—</span>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{role.definition}</p>
                </div>
              </div>

              {/* Assignment type cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {role.types.map((type) => (
                  type.available ? (
                    <div
                      key={type.id}
                      className="rounded-lg bg-white border border-[#E3E0D8] overflow-hidden flex flex-col transition-colors hover:border-[#AEB8C2]"
                    >
                      <div className="p-5 flex flex-col gap-4 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 rounded-md bg-[#24313F] flex items-center justify-center shrink-0">
                            <AssignmentIcon id={type.id} className="w-4 h-4 text-white" />
                          </div>
                          <span className="rounded border border-[#BFD7EA] bg-[#EAF2FA] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#2563A6] uppercase tracking-wider mt-1">
                            Available
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-[#18202A] leading-snug mb-1.5">{type.label}</h3>
                          <p className="text-xs text-[#6B7280] leading-relaxed">{type.description}</p>
                        </div>
                        <button
                          onClick={() => router.push(buildOralAssessmentUrl())}
                          className="w-full py-2 text-sm font-semibold text-white bg-[#2563A6] rounded-md hover:bg-[#1E518B] transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={type.id}
                      className="rounded-lg border border-dashed border-[#E3E0D8] bg-white/60 flex flex-col"
                    >
                      <div className="p-5 flex flex-col gap-4 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-8 h-8 rounded-md bg-[#F0EEE8] flex items-center justify-center shrink-0">
                            <AssignmentIcon id={type.id} className="w-4 h-4 text-[#AEB8C2]" />
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-[#8A8F98] uppercase tracking-wider mt-1">
                            Soon
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-[#6B7280] leading-snug mb-1.5">{type.label}</h3>
                          <p className="text-xs text-[#8A8F98] leading-relaxed">{type.description}</p>
                        </div>
                        {requested.has(type.id) ? (
                          <button
                            onClick={() => handleUnrequest(type.id)}
                            disabled={!!loading[type.id]}
                            className="group w-full py-2 text-sm font-medium border rounded-md transition-colors disabled:opacity-60 disabled:cursor-default border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-[#BFD7EA] hover:bg-[#EAF2FA] hover:text-[#2563A6]"
                          >
                            <span className="group-hover:hidden">
                              {loading[type.id] === 'unrequesting' ? 'Removing…' : 'Requested ✓'}
                            </span>
                            <span className="hidden group-hover:inline">Remove request</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRequest(type.id)}
                            disabled={!!loading[type.id]}
                            className="w-full py-2 text-sm font-medium text-[#6B7280] border border-[#E3E0D8] rounded-md hover:bg-[#FAF9F6] disabled:opacity-60 disabled:cursor-default transition-colors"
                          >
                            {loading[type.id] === 'requesting' ? 'Requesting…' : 'Request this type'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
