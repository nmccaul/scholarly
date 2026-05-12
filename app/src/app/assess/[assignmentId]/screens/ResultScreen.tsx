import Link from 'next/link'
import type { AssignmentId } from '@/types/domain'
import type { SubmitResponse } from '@/types/api'

interface Props {
  result: SubmitResponse
  assignmentId: AssignmentId
}

export function ResultScreen({ result, assignmentId }: Props) {
  const { finalGrade, pointsPossible, aiGradeRationale, syncStatus } = result
  const pct =
    finalGrade !== null && pointsPossible > 0
      ? Math.round((finalGrade / pointsPossible) * 100)
      : null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#18202A] mb-1">Assessment Complete</h1>
        <p className="text-sm text-[#6B7280] mb-8">
          {syncStatus === 'success' && 'Your grade has been submitted to Canvas.'}
          {syncStatus === 'failed' && 'Your response was recorded, but the Canvas grade sync failed. Your instructor has been notified.'}
          {syncStatus === null && 'Your response has been recorded.'}
        </p>

        <div className="bg-white border border-[#E3E0D8] rounded-2xl p-8 text-center mb-8">
          <div className="text-6xl font-bold text-[#18202A] mb-1 tabular-nums">
            {finalGrade !== null ? finalGrade.toFixed(0) : '—'}
            <span className="text-3xl text-[#8A8F98] font-normal"> / {pointsPossible}</span>
          </div>
          {pct !== null && <div className="text-lg text-[#6B7280] mt-1">{pct}%</div>}
        </div>

        {aiGradeRationale && (
          <>
            <h2 className="text-base font-semibold text-[#18202A] mb-4">Grade Breakdown</h2>
            <div className="space-y-3 mb-6">
              {aiGradeRationale.criteriaScores.map((s, i) => (
                <div key={i} className="bg-white border border-[#E3E0D8] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-[#18202A] text-sm">{s.label}</span>
                    <span className="text-sm text-[#6B7280] tabular-nums font-medium">
                      {s.score} pts
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280]">{s.rationale}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E3E0D8] rounded-xl p-4 mb-8">
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Overall Feedback
              </div>
              <p className="text-sm text-[#24313F] leading-relaxed">
                {aiGradeRationale.overallFeedback}
              </p>
            </div>
          </>
        )}

        <div className="border-t border-[#EEEAE2] pt-8 flex flex-col gap-3">
          <Link
            href={`/dashboard/${assignmentId}`}
            className="block w-full text-center py-3 bg-[#2563A6] text-white font-semibold rounded-xl hover:bg-[#1E518B] transition-colors text-sm"
          >
            View Submissions
          </Link>
          <Link
            href="/dashboard"
            className="block w-full text-center py-3 border border-[#E3E0D8] text-[#374151] font-semibold rounded-xl hover:bg-[#FAF9F6] transition-colors text-sm"
          >
            All Assignments
          </Link>
        </div>
      </div>
    </div>
  )
}
