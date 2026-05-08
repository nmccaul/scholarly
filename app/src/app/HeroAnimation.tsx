'use client'

import { useState, useEffect } from 'react'

const BARS = [
  { id: 'b0',  h: 12, speed: '2.0s', delay: '0s'    },
  { id: 'b1',  h: 22, speed: '2.3s', delay: '0.2s'  },
  { id: 'b2',  h: 34, speed: '1.8s', delay: '0.4s'  },
  { id: 'b3',  h: 28, speed: '2.5s', delay: '0.6s'  },
  { id: 'b4',  h: 44, speed: '2.1s', delay: '0.1s'  },
  { id: 'b5',  h: 40, speed: '1.9s', delay: '0.5s'  },
  { id: 'b6',  h: 44, speed: '2.4s', delay: '0.3s'  },
  { id: 'b7',  h: 36, speed: '2.0s', delay: '0.7s'  },
  { id: 'b8',  h: 28, speed: '2.2s', delay: '0.45s' },
  { id: 'b9',  h: 20, speed: '1.8s', delay: '0.15s' },
  { id: 'b10', h: 14, speed: '2.3s', delay: '0.6s'  },
  { id: 'b11', h: 8,  speed: '2.0s', delay: '0.35s' },
]
const SLIDES = ['oral', 'discussion', 'reading'] as const
type Slide = typeof SLIDES[number]
const SLIDE_DURATION = 8000
const FADE_MS = 300

// ─────────────────────────────────────────────────────────────────────────────
// Slide 1 — Oral Assessment
// ─────────────────────────────────────────────────────────────────────────────

function OralSlide() {
  return (
    <>
      {/* Student recording card */}
      <div
        className="absolute left-0 top-6 w-[300px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden z-10 animate-gpu"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        {/* Prompt */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
              Recording
            </span>
            <span className="ml-auto font-mono text-xs text-slate-400">0:47 / 2:00</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Explain how monetary policy affects inflation. Use two examples from the course readings.
          </p>
        </div>

        {/* Waveform */}
        <div className="px-5 pb-5">
          <div className="flex items-end gap-[3px] h-12 mb-3">
            {BARS.map(({ id, h, speed, delay }) => (
              <span
                key={id}
                className="flex-1 rounded-full bg-red-400 origin-bottom animate-gpu"
                style={{ height: `${h}px`, animation: `wave-bar-organic ${speed} ease-in-out infinite`, animationDelay: delay }}
              />
            ))}
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-[39%] rounded-full bg-red-400" />
          </div>
        </div>
      </div>

      {/* Grade card */}
      <div
        className="absolute right-0 bottom-14 w-[196px] bg-white rounded-2xl border border-slate-200 shadow-md z-10 animate-gpu"
        style={{ animation: 'float-offset 6s ease-in-out infinite 2s' }}
      >
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">AI Grade</p>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-bold text-slate-900 leading-none">18</span>
            <span className="text-sm text-slate-400">/ 20 pts</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Content accuracy', w: '100%' },
              { label: 'Communication',   w: '83%'  },
              { label: 'Use of examples', w: '83%'  },
            ].map(({ label, w }) => (
              <div key={label}>
                <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: w }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-4 mb-4 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[10px] font-semibold text-emerald-700">Synced to Canvas</span>
        </div>
      </div>

      {/* Insight */}
      <p className="absolute bottom-9 left-0 text-xs font-medium text-slate-400 italic">
        Assess real understanding, not AI output.
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide 2 — Smart Matching Discussion
// ─────────────────────────────────────────────────────────────────────────────

function DiscussionSlide() {
  return (
    <>
      {/* Posts card */}
      <div
        className="absolute left-0 top-6 w-[300px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden z-10 animate-gpu"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Unit 3 Discussion</p>
          <span className="text-xs text-slate-400">28 posts</span>
        </div>
        {[
          { init: 'A', name: 'Aisha M.', tag: 'Pro carbon tax',    avatarCls: 'text-violet-600 bg-violet-50', tagCls: 'text-violet-600 bg-violet-50 border-violet-100' },
          { init: 'J', name: 'Jake T.',  tag: 'Pro cap-and-trade', avatarCls: 'text-blue-600 bg-blue-50',    tagCls: 'text-blue-600 bg-blue-50 border-blue-100'       },
          { init: 'S', name: 'Sofia R.', tag: 'Pro regulation',    avatarCls: 'text-amber-600 bg-amber-50',  tagCls: 'text-amber-600 bg-amber-50 border-amber-100'    },
        ].map(({ init, name, tag, avatarCls, tagCls }) => (
          <div key={name} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls}`}>
              {init}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800">{name}</p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-px rounded border ${tagCls}`}>{tag}</span>
            </div>
          </div>
        ))}
        <div className="px-5 py-3 flex items-center gap-2 bg-slate-50">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
          <span className="text-[10px] text-slate-500">AI reading viewpoints across all posts…</span>
        </div>
      </div>

      {/* Match card */}
      <div
        className="absolute right-0 bottom-14 w-[196px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden z-10 animate-gpu"
        style={{ animation: 'float-offset 6s ease-in-out infinite 2s' }}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Aisha's matches</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { name: 'Jake T.',  reason: 'Opposing: market vs. tax' },
            { name: 'Sofia R.', reason: 'Gap: regulatory framing'  },
          ].map(({ name, reason }) => (
            <div key={name} className="px-4 py-3">
              <p className="text-xs font-semibold text-slate-800 mb-0.5">{name}</p>
              <p className="text-[10px] text-slate-500">{reason}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-violet-50">
          <p className="text-[10px] font-semibold text-violet-700">AI-assigned, not random</p>
        </div>
      </div>

      {/* Insight */}
      <p className="absolute bottom-9 left-0 text-xs font-medium text-slate-400 italic">
        Spark real, deep discussions — not surface-level posts.
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide 3 — Interactive Reading
// ─────────────────────────────────────────────────────────────────────────────

function ReadingSlide() {
  return (
    <>
      {/* Document card */}
      <div
        className="absolute left-0 top-6 w-[300px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden z-10 animate-gpu"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Marbury v. Madison</p>
          <span className="text-[10px] font-medium text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">Reading</span>
        </div>

        {/* Readable text */}
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed">
            The constitution is either a superior paramount law, unchangeable by ordinary means, or it is on a level with ordinary legislative acts…
          </p>
        </div>

        {/* Checkpoint gate */}
        <div className="border-b-2 border-teal-400 bg-teal-50 px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Checkpoint 2 — answer to continue</p>
          </div>
          <p className="text-xs text-slate-700 mb-2.5">What claim does Marshall make about constitutional supremacy?</p>
          <div className="h-7 rounded-lg bg-white border border-teal-200 px-3 flex items-center">
            <span className="text-[11px] text-slate-300">Your answer…</span>
          </div>
        </div>

        {/* Locked section */}
        <div className="px-5 py-3 opacity-30 pointer-events-none select-none">
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            If then the courts are to regard the constitution, and the constitution is superior to any ordinary act of the legislature…
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pb-3">
          <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] text-slate-300 font-medium">Locked until answered</span>
        </div>
      </div>

      {/* Progress card */}
      <div
        className="absolute right-0 bottom-14 w-[176px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden z-10 animate-gpu"
        style={{ animation: 'float-offset 6s ease-in-out infinite 2s' }}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Progress</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { label: 'Section 1',       state: 'done',   note: '10 / 10'       },
            { label: 'Section 2',       state: 'active', note: 'In progress'   },
            { label: 'Section 3',       state: 'locked', note: ''              },
            { label: 'Spoken summary',  state: 'locked', note: 'No text shown' },
          ].map(({ label, state, note }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${
                state === 'done'   ? 'bg-emerald-500' :
                state === 'active' ? 'border-2 border-teal-500' :
                'border-2 border-slate-200'
              }`}>
                {state === 'done' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-[10px] font-medium ${state === 'locked' ? 'text-slate-300' : state === 'active' ? 'text-teal-700' : 'text-slate-600'}`}>{label}</p>
                {note && <p className={`text-[9px] ${state === 'done' ? 'text-emerald-500' : state === 'active' ? 'text-teal-400' : 'text-slate-300'}`}>{note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <p className="absolute bottom-9 left-0 text-xs font-medium text-slate-400 italic">
        Ensure every student actually engages with the material.
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────

const LABELS: Record<Slide, string> = {
  oral: 'Oral Assessment',
  discussion: 'Smart Discussion',
  reading: 'Interactive Reading',
}

export default function HeroAnimation() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIndex(i => (i + 1) % SLIDES.length); setVisible(true) }, FADE_MS)
    }, SLIDE_DURATION)
    return () => clearInterval(t)
  }, [])

  function goTo(i: number) {
    setVisible(false)
    setTimeout(() => { setIndex(i); setVisible(true) }, FADE_MS)
  }

  return (
    <div className="relative w-full h-[460px] select-none overflow-hidden" aria-hidden>
      <div style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out`, position: 'absolute', inset: 0 }}>
        {SLIDES[index] === 'oral'       && <OralSlide />}
        {SLIDES[index] === 'discussion' && <DiscussionSlide />}
        {SLIDES[index] === 'reading'    && <ReadingSlide />}
      </div>

      <div className="absolute bottom-0 left-0 flex items-center gap-4">
        {SLIDES.map((s, i) => (
          <button key={s} onClick={() => goTo(i)} className="flex items-center gap-1.5 group">
            <span className={`block h-1 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-red-600' : 'w-2.5 bg-slate-200 group-hover:bg-slate-300'}`} />
            <span className={`text-[10px] font-medium transition-colors ${i === index ? 'text-slate-600' : 'text-slate-300 group-hover:text-slate-400'}`}>{LABELS[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
