interface Props {
  sectionIndex: number
  totalSections: number
  title: string
  content: string
  onFinishedReading: () => void
}

export function ReadingScreen({ sectionIndex, totalSections, title, content, onFinishedReading }: Props) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[#E3E0D8]">
        <div
          className="h-full bg-[#2563A6] transition-all duration-500"
          style={{ width: `${((sectionIndex) / totalSections) * 100}%` }}
        />
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Section header */}
        <div className="mb-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280] mb-1">
            Section {sectionIndex + 1} of {totalSections}
          </p>
          <h1 className="text-2xl font-bold text-[#18202A] leading-snug">{title}</h1>
        </div>

        {/* Reading content */}
        <div className="bg-white rounded-xl border border-[#E3E0D8] p-8 mb-8 shadow-sm">
          <div className="prose prose-sm max-w-none text-[#24313F] leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-end">
          <button
            onClick={onFinishedReading}
            className="flex items-center gap-2 rounded-xl bg-[#24313F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1A252F] transition-colors"
          >
            I&apos;ve finished reading
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
