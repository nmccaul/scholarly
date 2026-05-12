import { formatCountdown } from '../hooks/useAssessment'

interface Props {
  secondsLeft: number
  prompt: string
  onStartNow: () => void
}

export function PrepScreen({ secondsLeft, prompt, onStartNow }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-xl">
        <div className="text-sm font-semibold text-[#2563A6] uppercase tracking-widest mb-4 text-center">
          Preparation Time
        </div>
        <div className="text-8xl font-bold text-[#18202A] text-center mb-8 tabular-nums">
          {formatCountdown(secondsLeft)}
        </div>
        <div className="bg-white border border-[#E3E0D8] rounded-xl p-6 mb-8">
          <div className="text-xs font-semibold text-[#8A8F98] uppercase tracking-wide mb-2">
            Prompt
          </div>
          <p className="text-[#24313F] text-base leading-relaxed">{prompt}</p>
        </div>
        <button
          onClick={onStartNow}
          className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
        >
          Start Recording Now
        </button>
      </div>
    </div>
  )
}
