'use client'

const WAVE_DELAYS = ['0s', '0.15s', '0.3s', '0.45s', '0.6s', '0.45s', '0.3s', '0.15s', '0s', '0.15s']

export default function HeroAnimation() {
  return (
    <div className="relative w-full h-[460px] flex items-center justify-center select-none" aria-hidden>

      {/* Main card — assignment recording */}
      <div
        className="absolute left-0 top-10 w-[285px] bg-white border border-slate-200 rounded-2xl overflow-hidden z-10 shadow-lg"
        style={{ animation: 'float 5.5s ease-in-out infinite' }}
      >
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              Oral Assessment
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-snug">Week 4: Economic Policy</p>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
            Explain how monetary policy affects inflation rates. Use at least two specific examples from course readings in your response.
          </p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-red-500"
                style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }}
              />
              <span className="text-[11px] font-semibold text-slate-700">Recording</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">0:47 / 2:00</span>
          </div>

          <div className="flex items-center gap-[3px] h-6">
            {WAVE_DELAYS.map((delay, i) => (
              <span
                key={i}
                className="flex-1 bg-red-400 rounded-full origin-bottom"
                style={{
                  height: '20px',
                  animation: `wave-bar 0.8s ease-in-out infinite`,
                  animationDelay: delay,
                }}
              />
            ))}
          </div>

          <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-[39%] bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Grade result card */}
      <div
        className="absolute right-0 bottom-10 w-[220px] bg-white border border-slate-200 rounded-2xl p-4 z-10 shadow-lg"
        style={{ animation: 'float-offset 5.5s ease-in-out infinite 1.8s' }}
      >
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Grade</p>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-3xl font-bold text-slate-900">18</span>
          <span className="text-sm text-slate-400 font-medium">/ 20 pts</span>
        </div>

        <div className="space-y-1.5 mb-3">
          {[
            { label: 'Content accuracy', score: '8/8', good: true },
            { label: 'Communication', score: '5/6', good: true },
            { label: 'Use of examples', score: '5/6', good: false },
          ].map(({ label, score, good }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{label}</span>
              <span className={`text-[10px] font-semibold ${good ? 'text-emerald-500' : 'text-slate-500'}`}>{score}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
          <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[10px] font-semibold text-emerald-700">Synced to Canvas</span>
        </div>
      </div>

      {/* Floating pill */}
      <div
        className="absolute right-16 top-14 bg-white border border-slate-200 rounded-full shadow-md px-3 py-1.5 flex items-center gap-2 z-10"
        style={{ animation: 'float 7s ease-in-out infinite 0.5s' }}
      >
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
        <span className="text-[10px] font-semibold text-slate-600">AI grading in progress…</span>
      </div>

    </div>
  )
}
