'use client'

interface Props {
  sectionIndex: number
  totalSections: number
  title: string
  content: string
  checkpointActive: boolean
  onBeginCheckpoint: () => void
}

export function ReadingPane({
  sectionIndex,
  totalSections,
  title,
  content,
  checkpointActive,
  onBeginCheckpoint,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-4 border-b border-[#E3E0D8] bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Section {sectionIndex + 1} of {totalSections}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSections }).map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1 w-6 rounded-full transition-colors duration-300',
                  i < sectionIndex
                    ? 'bg-[#10B981]'
                    : i === sectionIndex
                    ? 'bg-[#2563A6]'
                    : 'bg-[#E3E0D8]',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[#18202A]">{title}</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-[#E3E0D8] bg-white shrink-0">
        {checkpointActive ? (
          <div className="text-center text-xs text-[#6B7280] py-1">
            Complete the checkpoint on the right to continue
          </div>
        ) : (
          <button
            onClick={onBeginCheckpoint}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
          >
            I&apos;ve finished reading →
          </button>
        )}
      </div>
    </div>
  )
}
