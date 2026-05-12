interface Props {
  transcript: string
  followUpExchanges: Array<{ question: string; answerTranscript: string }>
  onSubmit: () => void
}

export function ReviewScreen({ transcript, followUpExchanges, onSubmit }: Props) {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#18202A] mb-1">Review Your Response</h1>
        <p className="text-sm text-[#6B7280] mb-8">
          Review the transcript generated from your recording before submitting.
        </p>

        <label className="block text-sm font-semibold text-[#374151] mb-2">Your response</label>
        <div className="mb-8 min-h-40 whitespace-pre-wrap rounded-xl border border-[#D4CEC3] bg-[#FAF9F6] p-4 text-sm leading-relaxed text-[#18202A]">
          {transcript || 'No transcript was generated.'}
        </div>

        {followUpExchanges.length > 0 && (
          <div className="mb-8">
            <div className="text-sm font-semibold text-[#374151] mb-3">Follow-up exchanges</div>
            <div className="space-y-3">
              {followUpExchanges.map((e, i) => (
                <div key={i} className="bg-white border border-[#E3E0D8] rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#2563A6] mb-1">Q: {e.question}</div>
                  <div className="text-sm text-[#374151]">A: {e.answerTranscript}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onSubmit}
          className="w-full py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors"
        >
          Submit for Grading
        </button>
      </div>
    </div>
  )
}
