interface Props {
  totalSections: number
  onSubmit: () => void
  submitting: boolean
}

export function AllSectionsCompleteScreen({ totalSections, onSubmit, submitting }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#EAF2FA] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#2563A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#18202A] mb-2">Reading complete</h1>
        <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
          You&apos;ve completed all {totalSections} section{totalSections !== 1 ? 's' : ''} of the reading.
          Submit to receive your grade.
        </p>

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563A6] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <><Spinner />Submitting for grading…</>
          ) : (
            <>Submit for grading <span>→</span></>
          )}
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
