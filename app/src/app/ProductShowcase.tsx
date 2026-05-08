'use client'

import Link from 'next/link'
import { useState } from 'react'

type Status = 'live' | 'priority' | 'soon'

const PRODUCTS: {
  title: string
  description: string
  status: Status
  disciplines?: string
}[] = [
  {
    title: 'Oral Assessment',
    status: 'live',
    description:
      'Student speaks a response; AI transcribes, asks follow-up questions, and grades against a rubric. Scores sync back to Canvas automatically.',
    disciplines: 'Any discipline',
  },
  {
    title: 'Smart Matching Discussion',
    status: 'priority',
    description:
      'AI reads every post in a cohort and assigns each student specific peers to respond to based on complementary viewpoints and knowledge gaps — engineering the conversation, not just grading it.',
    disciplines: 'Humanities · Social sciences · Business',
  },
  {
    title: 'Interactive Reading',
    status: 'priority',
    description:
      'AI drops context-specific checkpoints as the student reads, gating scroll progress. Ends with a spoken summary the student records without the text visible.',
    disciplines: 'Law · Medicine · Humanities',
  },
  {
    title: 'Concept Explanation Challenge',
    status: 'soon',
    description:
      '"Explain this to a 5-year-old." AI checks accuracy under simplification with follow-up questions.',
    disciplines: 'STEM · Medicine · Nursing',
  },
  {
    title: 'Socratic Seminar Simulation',
    status: 'soon',
    description:
      'Multi-turn voice dialogue with an AI Socratic questioner. Student defends a position under sustained challenge.',
    disciplines: 'Philosophy · Law · Liberal arts',
  },
  {
    title: 'AI Debate Partner',
    status: 'soon',
    description:
      'Student argues a position against an AI opponent that rebuts with evidence and logic. Structured, timed, graded.',
    disciplines: 'Communications · Pre-law · Poli sci',
  },
  {
    title: 'Research Validity Audit',
    status: 'soon',
    description:
      'AI provides a mixed set of credible and flawed sources. Student evaluates each and justifies their reasoning.',
    disciplines: 'Research methods · Journalism',
  },
  {
    title: 'Process Narration',
    status: 'soon',
    description:
      'Student narrates their reasoning in real time while solving a problem. AI grades the thinking, not just the answer.',
    disciplines: 'STEM · Medicine · Engineering',
  },
  {
    title: 'Peer Review Simulation',
    status: 'soon',
    description:
      'AI generates a realistic but deliberately flawed submission. Student critiques it as a peer reviewer.',
    disciplines: 'Writing-intensive disciplines',
  },
  {
    title: 'Adaptive Reading Quiz',
    status: 'soon',
    description:
      'Teacher uploads a text; AI generates a branching question tree that adapts based on student answers.',
    disciplines: 'Law · Business · Medicine',
  },
]

type Filter = 'all' | Status

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
                className="relative rounded-2xl bg-slate-900 p-6 flex flex-col gap-4 overflow-hidden lg:col-span-1"
              >
                {/* Background glow */}
                <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-red-600 opacity-20 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
                      Live now
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{product.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-3">{product.description}</p>
                  {product.disciplines && (
                    <p className="text-xs text-slate-600 font-medium">{product.disciplines}</p>
                  )}
                </div>
                <div className="mt-auto">
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    Try the demo <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            )
          }

          if (product.status === 'priority') {
            return (
              <div
                key={product.title}
                className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/40 p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
                    In development
                  </span>
                  <span className="text-red-300 text-xs">✦</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2">{product.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>
                </div>
                {product.disciplines && (
                  <p className="text-[11px] text-red-400 font-medium mt-auto pt-2 border-t border-red-100">
                    {product.disciplines}
                  </p>
                )}
              </div>
            )
          }

          // coming soon
          return (
            <div
              key={product.title}
              className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-medium text-slate-400 text-sm leading-snug">{product.title}</h3>
                <span className="text-slate-300 text-xs shrink-0">🔒</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{product.description}</p>
              {product.disciplines && (
                <p className="text-[10px] text-slate-300 font-medium mt-auto">{product.disciplines}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
