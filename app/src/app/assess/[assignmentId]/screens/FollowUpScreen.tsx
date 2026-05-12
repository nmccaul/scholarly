import { RefObject } from 'react'
import { Centered } from './Centered'
import { formatCountdown } from '../hooks/useAssessment'

type FollowUpPhase = 'question' | 'recording' | 'processing'

interface Props {
  phase: FollowUpPhase
  displayIndex: number
  totalCount: number
  currentQuestion: string | null
  secondsLeft: number
  maxResponseTimeSeconds: number
  cameraRequired: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  onStartRecording: () => void
  onStopRecording: () => void
}

export function FollowUpScreen({
  phase,
  displayIndex,
  totalCount,
  currentQuestion,
  secondsLeft,
  maxResponseTimeSeconds,
  cameraRequired,
  videoRef,
  onStartRecording,
  onStopRecording,
}: Props) {
  if (phase === 'question') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-xl">
          <div className="text-sm font-semibold text-[#2563A6] uppercase tracking-widest mb-4 text-center">
            Follow-up {displayIndex + 1} of {totalCount}
          </div>
          {currentQuestion ? (
            <>
              <div className="bg-white border border-[#E3E0D8] rounded-xl p-6 mb-8">
                <p className="text-[#18202A] text-base leading-relaxed">{currentQuestion}</p>
              </div>
              <button
                onClick={onStartRecording}
                className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
              >
                Record Your Answer
              </button>
            </>
          ) : (
            <Centered>Generating question…</Centered>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="flex flex-col items-center min-h-screen p-8">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-[#E3E0D8] rounded-xl p-4 mb-6 text-sm text-[#24313F] leading-relaxed">
            {currentQuestion}
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2563A6]">
              <span className="w-2 h-2 rounded-full bg-[#C2413A] animate-pulse" />
              Recording
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#18202A]">
              {formatCountdown(secondsLeft)}
            </div>
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
            onClick={onStopRecording}
            className="w-full py-3 bg-[#24313F] text-white font-semibold rounded-xl hover:bg-[#18202A] transition-colors"
          >
            Finish Recording
          </button>
        </div>
      </div>
    )
  }

  return <Centered>Processing your answer…</Centered>
}
