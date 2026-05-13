export function CheckpointEvaluatingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="text-center">
        <svg className="h-8 w-8 animate-spin text-[#2563A6] mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm font-medium text-[#18202A]">Reviewing your response…</p>
        <p className="text-xs text-[#8A8F98] mt-1">This may take a moment.</p>
      </div>
    </div>
  )
}
