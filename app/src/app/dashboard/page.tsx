import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { listAssignmentsForCourse } from '@/lib/assignments/repository'
import type { AssignmentSummary } from '@/lib/assignments/repository'
import DeleteAssignmentButton from './DeleteAssignmentButton'

export const dynamic = 'force-dynamic'

export default async function DashboardHomePage() {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) {
      return <ErrorPage message="Session expired. Please re-launch from Canvas." />
    }
    throw e
  }

  const assignments = await listAssignmentsForCourse(session.courseId)
  const totalSubmitted = assignments.reduce((n, a) => n + a.submittedCount, 0)
  const totalInProgress = assignments.reduce((n, a) => n + a.inProgressCount, 0)

  return (
    <div className="px-8 py-8 max-w-5xl">

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Mission Control
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">Overview</h1>
        </div>
        <Link
          href="/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Assignment
        </Link>
      </div>

      {/* Course-level stat strip */}
      {assignments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Assignments" value={assignments.length} />
          <StatCard label="Submitted" value={totalSubmitted} accent="emerald" />
          <StatCard label="In Progress" value={totalInProgress} accent="blue" />
        </div>
      )}

      {/* Assignment cards */}
      {assignments.length === 0 ? (
        <div className="bg-white border border-[#E3E0D8] rounded-xl p-16 text-center">
          <p className="text-[#6B7280] text-sm mb-4">No assignments yet.</p>
          <Link
            href="/builder"
            className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
          >
            Create your first assignment
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}

    </div>
  )
}

function AssignmentCard({ assignment: a }: { assignment: AssignmentSummary }) {
  const isReading = a.type === 'reading_assessment'
  const typeLabel = isReading ? 'Checkpoint Reading' : 'Oral Assessment'
  const total = a.submittedCount + a.inProgressCount

  return (
    <div className="bg-white border border-[#E3E0D8] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#C8C4BC] transition-colors group">

      {/* Type indicator */}
      <div className={`shrink-0 w-1.5 self-stretch rounded-full ${isReading ? 'bg-[#2563A6]' : 'bg-[#7C6F8E]'}`} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[#18202A] truncate">{a.title}</span>
          <span className="font-mono text-[10px] text-[#AEB8C2] uppercase tracking-wider shrink-0">{typeLabel}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <ProgressBar submitted={a.submittedCount} inProgress={a.inProgressCount} total={total} />
          <div className="flex items-center gap-3 shrink-0">
            {a.submittedCount > 0 && (
              <StatusPill count={a.submittedCount} color="emerald" label="submitted" />
            )}
            {a.inProgressCount > 0 && (
              <StatusPill count={a.inProgressCount} color="blue" label="in progress" />
            )}
            {total === 0 && (
              <span className="text-[11px] text-[#AEB8C2]">No submissions yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Points */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-xs font-semibold text-[#374151]">{a.pointsPossible}</div>
        <div className="font-mono text-[9px] text-[#AEB8C2] uppercase tracking-wider">pts</div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {isReading && (
          <Link
            href={`/dashboard/${a.id}/insights`}
            className="px-3 py-1.5 text-xs font-medium text-[#2563A6] border border-[#C4D7EC] rounded-lg hover:bg-[#EFF6FF] transition-colors"
          >
            Insights
          </Link>
        )}
        <Link
          href={`/dashboard/${a.id}`}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
        >
          View
        </Link>
        <DeleteAssignmentButton assignmentId={a.id} />
      </div>

    </div>
  )
}

function ProgressBar({
  submitted,
  inProgress,
  total,
}: {
  submitted: number
  inProgress: number
  total: number
}) {
  if (total === 0) {
    return <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full" />
  }
  const submittedPct = (submitted / total) * 100
  const inProgressPct = (inProgress / total) * 100
  return (
    <div className="flex-1 h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden flex">
      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${submittedPct}%` }} />
      <div className="h-full bg-blue-300 transition-all" style={{ width: `${inProgressPct}%` }} />
    </div>
  )
}

function StatusPill({
  count,
  color,
  label,
}: {
  count: number
  color: 'emerald' | 'blue'
  label: string
}) {
  const styles = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-600',
  }
  return (
    <span className={`text-[11px] font-mono font-semibold tabular-nums ${styles[color]}`}>
      {count} <span className="font-normal text-[#AEB8C2]">{label}</span>
    </span>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'emerald' | 'blue'
}) {
  const valueStyle = accent === 'emerald'
    ? 'text-emerald-700'
    : accent === 'blue'
    ? 'text-blue-600'
    : 'text-[#18202A]'

  return (
    <div className="bg-white border border-[#E3E0D8] rounded-xl px-5 py-4">
      <div className={`text-2xl font-semibold tabular-nums ${valueStyle}`}>{value}</div>
      <div className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-[#6B7280]">{message}</p>
    </div>
  )
}
