import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { getClassInsightsStats } from '@/lib/reading/repository'
import type { AssignmentId, CheckpointStatus } from '@/types/domain'
import InsightsChatInterface from './InsightsChatInterface'
import CompletionFunnelChart from './CompletionFunnelChart'
import GradeDistributionChart from './GradeDistributionChart'

export const dynamic = 'force-dynamic'

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params

  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) {
      return <ErrorPage message="Session expired. Please re-launch from Canvas." />
    }
    throw e
  }

  const assignment = await findReadingAssignmentWithConfig(assignmentId as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) {
    return <ErrorPage message="Assignment not found." />
  }
  if (assignment.type !== 'reading_assessment') {
    return <ErrorPage message="Insights are only available for reading assignments." />
  }

  const sectionTitles = assignment.config.sections.map((s) => s.title)
  const stats = await getClassInsightsStats(assignment.id, sectionTitles)
  const hasData = stats.studentGrid.length > 0
  const totalStudents = stats.submittedCount + stats.inProgressCount

  const funnelData = stats.sectionStats.map((s, i) => ({
    section: `S${i + 1}`,
    title: s.sectionTitle,
    students: s.totalReached,
  }))

  const allGrades = stats.studentGrid.map((r) => r.finalGrade)

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#FAF9F6]">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-[#E3E0D8] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dashboard/${assignmentId}`}
            className="text-sm text-[#6B7280] hover:text-[#18202A] transition-colors shrink-0"
          >
            ←
          </Link>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest">
              Insights
            </div>
            <div className="text-sm font-semibold text-[#18202A] truncate">{assignment.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatChip label="Submitted" value={stats.submittedCount} />
          <StatChip label="In Progress" value={stats.inProgressCount} />
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Left/center — scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {!hasData ? (
            <div className="flex items-center justify-center h-full text-center p-8">
              <p className="text-sm text-[#6B7280]">
                No submissions yet — insights will appear once students begin.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Charts row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-[#E3E0D8] rounded-lg p-4">
                  <div className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest mb-1">
                    Student completion
                  </div>
                  <p className="text-xs text-[#AEB8C2] mb-3">
                    Students who reached each section
                  </p>
                  <CompletionFunnelChart data={funnelData} totalStudents={totalStudents} />
                </div>

                <div className="bg-white border border-[#E3E0D8] rounded-lg p-4">
                  <div className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest mb-1">
                    Grade distribution
                  </div>
                  <p className="text-xs text-[#AEB8C2] mb-3">
                    Final grades as % of {assignment.pointsPossible} pts
                  </p>
                  <GradeDistributionChart
                    grades={allGrades}
                    pointsPossible={assignment.pointsPossible}
                  />
                </div>
              </div>

              {/* Section difficulty */}
              <div className="bg-white border border-[#E3E0D8] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E3E0D8] bg-[#F0EEE8]">
                  <span className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest">
                    Section difficulty
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F0EEE8]">
                      <th className="text-left px-5 py-2.5 font-mono text-[10px] text-[#AEB8C2] uppercase tracking-wider">Section</th>
                      <th className="text-right px-5 py-2.5 font-mono text-[10px] text-[#AEB8C2] uppercase tracking-wider">Pass Rate</th>
                      <th className="text-right px-5 py-2.5 font-mono text-[10px] text-[#AEB8C2] uppercase tracking-wider">Avg Follow-Ups</th>
                      <th className="text-right px-5 py-2.5 font-mono text-[10px] text-[#AEB8C2] uppercase tracking-wider">Force-Unlock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9F8F5]">
                    {stats.sectionStats.map((s) => {
                      const passRate = s.totalReached > 0
                        ? Math.round((s.passedCount / s.totalReached) * 100) : null
                      const forceRate = s.totalReached > 0
                        ? Math.round((s.forceUnlockedCount / s.totalReached) * 100) : null
                      return (
                        <tr key={s.sectionIndex} className="hover:bg-[#FAF9F6]">
                          <td className="px-5 py-3">
                            <span className="font-mono text-[10px] text-[#AEB8C2] mr-2">S{s.sectionIndex + 1}</span>
                            <span className="text-[#18202A] text-xs">{s.sectionTitle}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {passRate === null ? <Dash /> : (
                              <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${passRateStyle(passRate)}`}>
                                {passRate}%
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-[#374151]">
                            {s.totalReached === 0 ? <Dash /> : s.avgFollowUps.toFixed(1)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-[#374151]">
                            {forceRate === null ? <Dash /> : `${forceRate}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Student progress grid */}
              <div className="bg-white border border-[#E3E0D8] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E3E0D8] bg-[#F0EEE8]">
                  <span className="font-mono text-[10px] font-medium text-[#8A8F98] uppercase tracking-widest">
                    Student progress
                  </span>
                </div>
                <div className="divide-y divide-[#F9F8F5]">
                  {stats.studentGrid.map((student) => (
                    <div
                      key={student.submissionId}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF9F6]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#18202A] truncate">
                          {student.studentName ?? 'Unknown student'}
                        </div>
                        {student.studentEmail && (
                          <div className="text-[10px] text-[#AEB8C2] truncate">{student.studentEmail}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {sectionTitles.map((title, i) => {
                          const status = student.checkpointsBySection[i] ?? 'locked'
                          return (
                            <span
                              key={i}
                              title={`${title}: ${status.replace('_', ' ')}`}
                              className={`inline-flex items-center justify-center w-6 h-5 rounded text-[9px] font-mono font-bold ${checkpointPillStyle(status)}`}
                            >
                              {i + 1}
                            </span>
                          )
                        })}
                      </div>
                      <div className="font-mono text-[10px] tabular-nums text-[#8A8F98] w-14 text-right shrink-0">
                        {student.finalGrade !== null
                          ? `${student.finalGrade}/${assignment.pointsPossible}`
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 px-5 py-2.5 border-t border-[#F0EEE8] bg-[#FAFAF8]">
                  <Legend color="bg-emerald-100 text-emerald-700" label="Passed" />
                  <Legend color="bg-amber-100 text-amber-700" label="Unlocked" />
                  <Legend color="bg-blue-100 text-blue-700" label="Active" />
                  <Legend color="bg-gray-100 text-gray-400" label="Locked" />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right — chat sidebar */}
        <div className="w-[380px] shrink-0 border-l border-[#E3E0D8] overflow-hidden flex flex-col">
          <InsightsChatInterface assignmentId={assignmentId} />
        </div>

      </div>
    </div>
  )
}

function passRateStyle(rate: number): string {
  if (rate >= 70) return 'bg-emerald-50 text-emerald-700'
  if (rate >= 40) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function checkpointPillStyle(status: CheckpointStatus): string {
  switch (status) {
    case 'passed':         return 'bg-emerald-100 text-emerald-700'
    case 'force_unlocked': return 'bg-amber-100 text-amber-700'
    case 'in_progress':    return 'bg-blue-100 text-blue-700'
    default:               return 'bg-gray-100 text-gray-400'
  }
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] border border-[#E3E0D8] rounded-lg">
      <span className="text-sm font-semibold tabular-nums text-[#18202A]">{value}</span>
      <span className="text-xs text-[#8A8F98]">{label}</span>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-mono font-bold ${color}`}>1</span>
      <span className="text-[10px] text-[#AEB8C2]">{label}</span>
    </div>
  )
}

function Dash() {
  return <span className="text-[#AEB8C2] text-xs">—</span>
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-[#6B7280]">{message}</p>
    </div>
  )
}
