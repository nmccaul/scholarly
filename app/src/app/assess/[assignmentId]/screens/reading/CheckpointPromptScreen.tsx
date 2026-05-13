interface Props {
  sectionTitle: string
  checkpointType: 'text' | 'voice'
  onBegin: () => void
}

export function CheckpointPromptScreen({ sectionTitle, checkpointType, onBegin }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="max-w-lg w-full">
        <div className="mb-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Checkpoint — {sectionTitle}
          </p>
        </div>

        <h1 className="text-2xl font-bold text-[#18202A] mb-6 leading-tight">
          Before you continue
        </h1>

        <div className="bg-white rounded-xl border-2 border-[#2563A6] p-6 mb-6 shadow-sm">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#2563A6] mb-3">
            Your question
          </p>
          <p className="text-lg text-[#18202A] leading-relaxed font-medium italic">
            &ldquo;In your own words, what is this section arguing, and do you find it convincing?&rdquo;
          </p>
        </div>

        <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
          {checkpointType === 'voice'
            ? 'You\'ll have a live voice conversation with the AI. Take a moment to collect your thoughts, then click Begin when you\'re ready.'
            : 'Type your response. The AI may ask follow-up questions to deepen your analysis before unlocking the next section.'}
        </p>

        <button
          onClick={onBegin}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563A6] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
        >
          {checkpointType === 'voice' ? 'Begin voice conversation' : 'Begin checkpoint'}
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
