import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { listSubmissionsForAssignment } from '@/lib/submissions/repository'
import { listReadingSubmissionsForAssignment } from '@/lib/reading/repository'
import type { AssignmentId, AssignmentType } from '@/types/domain'

export const dynamic = 'force-dynamic'

function typeLabel(type: AssignmentType) {
  return type === 'reading_assessment' ? 'Checkpoint Reading' : 'Oral Assessment'
}

export default async function DashboardPage({
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

  // Try oral assignment first, then reading
  const oralAssignment = await findAssignmentWithConfig(assignmentId as AssignmentId)
  const readingAssignment = oralAssignment
    ? null
    : await findReadingAssignmentWithConfig(assignmentId as AssignmentId)

  const assignment = oralAssignment ?? readingAssignment
  if (!assignment || assignment.courseId !== session.courseId) {
    return <ErrorPage message="Assignment not found." />
  }

  const submissions = assignment.type === 'reading_assessment'
    ? await listReadingSubmissionsForAssignment(assignment.id)
    : await listSubmissionsForAssignment(assignment.id)

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-5xl px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-2">
              {typeLabel(assignment.type)}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">{assignment.title}</h1>
            <div className="text-sm text-[#6B7280] mt-1">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} &middot;{' '}
              {assignment.pointsPossible} pts possible
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#18202A] transition-colors"
            >
              ← All assignments
            </Link>
            <Link
              href={`/dashboard/${assignment.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-[#374151] border border-[#E3E0D8] rounded-lg hover:bg-white transition-colors"
            >
              Edit
            </Link>
            <Link
              href={`/assess/${assignment.id}`}
              className="px-4 py-2 text-sm font-medium text-[#374151] border border-[#E3E0D8] rounded-lg hover:bg-white transition-colors"
            >
              Preview as Student
            </Link>
            <Link
              href="/builder"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
            >
              + New Assignment
            </Link>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white border border-[#E3E0D8] rounded-lg p-12 text-center">
            <div className="text-[#6B7280] text-sm">No submissions yet.</div>
          </div>
        ) : (
          <div className="bg-white border border-[#E3E0D8] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E0D8] bg-[#F0EEE8]">
                  <th className="text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Student</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Submitted</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">AI Score</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Final Score</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Canvas Sync</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {submissions.map((s) => (
                  <tr key={s.submissionId} className="hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#18202A]">
                        {s.studentName ?? 'Unknown student'}
                      </div>
                      {s.studentEmail && (
                        <div className="text-xs text-[#8A8F98]">{s.studentEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#6B7280]">
                      {s.submittedAt ? formatDate(s.submittedAt) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-[#374151]">
                      {s.aiGrade !== null ? `${s.aiGrade} / ${assignment.pointsPossible}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums font-semibold text-[#18202A]">
                      {s.finalGrade !== null
                        ? `${s.finalGrade} / ${assignment.pointsPossible}`
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <SyncBadge status={s.syncStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/${assignmentId}/${s.submissionId}`}
                        className="text-[#2563A6] hover:text-[#1E518B] font-semibold text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SyncBadge({ status }: { status: 'pending' | 'success' | 'failed' | null }) {
  if (!status) {
    return <span className="text-xs text-[#8A8F98]">—</span>
  }
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-[#EAF2FA] text-[#1E518B] border-[#BFD7EA]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[11px] font-medium uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-[#6B7280]">{message}</p>
    </div>
  )
}
