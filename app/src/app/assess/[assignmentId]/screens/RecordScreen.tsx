import { RefObject } from 'react'
import { formatCountdown } from '../hooks/useAssessment'

interface Props {
  secondsLeft: number
  maxResponseTimeSeconds: number
  prompt: string
  cameraRequired: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  onStop: () => void
}

export function RecordScreen({ secondsLeft, maxResponseTimeSeconds, prompt, cameraRequired, videoRef, onStop }: Props) {
  const pct = maxResponseTimeSeconds > 0 ? (secondsLeft / maxResponseTimeSeconds) * 100 : 0

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2563A6]">
            <span className="w-2 h-2 rounded-full bg-[#C2413A] animate-pulse" />
            Recording
          </div>
          <div className="text-2xl font-bold tabular-nums text-[#18202A]">{formatCountdown(secondsLeft)}</div>
        </div>
        <div className="h-1.5 bg-[#E3E0D8] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-[#C2413A] rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="bg-white border border-[#E3E0D8] rounded-xl p-4 mb-6 text-sm text-[#374151] leading-relaxed">
          {prompt}
        </div>
        {cameraRequired && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-xl bg-black mb-6 aspect-video object-cover"
          />
        )}
        <button
          onClick={onStop}
          className="w-full py-3 bg-[#24313F] text-white font-semibold rounded-xl hover:bg-[#18202A] transition-colors"
        >
          Finish Recording
        </button>
      </div>
    </div>
  )
}
