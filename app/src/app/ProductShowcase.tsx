'use client'

import Link from 'next/link'
import { useState } from 'react'

type Status = 'live' | 'priority' | 'soon'

const PRODUCTS: {
  id: string
  title: string
  description: string
  status: Status
  disciplines?: string
}[] = [
  {
    id: 'oral_assessment',
    title: 'Oral Assessment',
    status: 'live',
    description:
      'Student speaks a response; AI transcribes, asks follow-up questions, and grades against a rubric. Scores sync back to Canvas automatically.',
    disciplines: 'Any discipline',
  },
  {
    id: 'smart_matching',
    title: 'Smart Matching Discussion',
    status: 'priority',
    description:
      'AI reads every post in a cohort and assigns each student specific peers to respond to based on complementary viewpoints and knowledge gaps — engineering the conversation, not just grading it.',
    disciplines: 'Humanities · Social sciences · Business',
  },
  {
    id: 'interactive_reading',
    title: 'Interactive Reading',
    status: 'priority',
    description:
      'AI drops context-specific checkpoints as the student reads, gating scroll progress. Ends with a spoken summary the student records without the text visible.',
    disciplines: 'Law · Medicine · Humanities',
  },
  {
    id: 'concept_explanation',
    title: 'Concept Explanation Challenge',
    status: 'soon',
    description:
      '"Explain this to a 5-year-old." AI checks accuracy under simplification with follow-up questions.',
    disciplines: 'STEM · Medicine · Nursing',
  },
  {
    id: 'socratic_seminar',
    title: 'Socratic Seminar Simulation',
    status: 'soon',
    description:
      'Multi-turn voice dialogue with an AI Socratic questioner. Student defends a position under sustained challenge.',
    disciplines: 'Philosophy · Law · Liberal arts',
  },
  {
    id: 'ai_debate',
    title: 'AI Debate Partner',
    status: 'soon',
    description:
      'Student argues a position against an AI opponent that rebuts with evidence and logic. Structured, timed, graded.',
    disciplines: 'Communications · Pre-law · Poli sci',
  },
  {
    id: 'research_audit',
    title: 'Research Validity Audit',
    status: 'soon',
    description:
      'AI provides a mixed set of credible and flawed sources. Student evaluates each and justifies their reasoning.',
    disciplines: 'Research methods · Journalism',
  },
  {
    id: 'process_narration',
    title: 'Process Narration',
    status: 'soon',
    description:
      'Student narrates their reasoning in real time while solving a problem. AI grades the thinking, not just the answer.',
    disciplines: 'STEM · Medicine · Engineering',
  },
  {
    id: 'peer_review_sim',
    title: 'Peer Review Simulation',
    status: 'soon',
    description:
      'AI generates a realistic but deliberately flawed submission. Student critiques it as a peer reviewer.',
    disciplines: 'Writing-intensive disciplines',
  },
  {
    id: 'adaptive_quiz',
    title: 'Adaptive Reading Quiz',
    status: 'soon',
    description:
      'Teacher uploads a text; AI generates a branching question tree that adapts based on student answers.',
    disciplines: 'Law · Business · Medicine',
  },
]

type Filter = 'all' | Status

function ProductIcon({ id, className }: { id: string; className?: string }) {
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
    case 'smart_matching':
      return (
        <svg {...props}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )
    case 'interactive_reading':
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
    case 'socratic_seminar':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
    case 'adaptive_quiz':
      return (
        <svg {...props}>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      )
    default:
      return null
  }
}

export default function ProductShowcase() {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'live', label: 'Available now' },
            { key: 'priority', label: 'In development' },
            { key: 'soon', label: 'Coming soon' },
          ] as { key: Filter; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              filter === key
                ? 'bg-red-600 text-white'
                : 'border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => {
          if (product.status === 'live') {
            return (
              <div
                key={product.title}
                className="relative rounded-2xl bg-zinc-950 border border-white/5 p-6 flex flex-col gap-5 overflow-hidden"
              >
                <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-red-600 opacity-10 blur-3xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/15 flex items-center justify-center shrink-0">
                    <ProductIcon id={product.id} className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-mono font-semibold text-red-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
                    LIVE
                  </span>
                </div>

                <div className="relative flex-1">
                  <h3 className="text-base font-semibold text-white mb-2">{product.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{product.description}</p>
                </div>

                <div className="relative flex items-center justify-between gap-3">
                  {product.disciplines && (
                    <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wide">{product.disciplines}</p>
                  )}
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors shrink-0 ml-auto"
                  >
                    Try demo <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            )
          }

          if (product.status === 'priority') {
            return (
              <div
                key={product.title}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col"
              >
                <div className="h-0.5 bg-gradient-to-r from-red-600 via-red-400 to-transparent" />
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <ProductIcon id={product.id} className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-red-600 uppercase tracking-widest mt-1">
                      In dev
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2">{product.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>
                  </div>
                  {product.disciplines && (
                    <p className="text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-3 mt-auto">
                      {product.disciplines}
                    </p>
                  )}
                </div>
              </div>
            )
          }

          // coming soon
          return (
            <div
              key={product.title}
              className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <ProductIcon id={product.id} className="w-4 h-4 text-slate-300" />
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-widest mt-1">
                  Soon
                </span>
              </div>
              <div>
                <h3 className="font-medium text-slate-400 text-sm leading-snug mb-1.5">{product.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{product.description}</p>
              </div>
              {product.disciplines && (
                <p className="text-[10px] text-slate-300 font-mono mt-auto">{product.disciplines}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
