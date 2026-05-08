import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { listSubmissionsForAssignment } from '@/lib/submissions/repository'
import type { AssignmentId } from '@/types/domain'

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

  const assignment = await findAssignmentWithConfig(assignmentId as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) {
    return <ErrorPage message="Assignment not found." />
  }

  const submissions = await listSubmissionsForAssignment(assignment.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Oral Assessment
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="text-sm text-gray-500 mt-1">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} &middot;{' '}
              {assignment.pointsPossible} pts possible
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← All assignments
            </Link>
            <Link
              href={`/dashboard/${assignment.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <Link
              href={`/assess/${assignment.id}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Preview as Student
            </Link>
            <Link
              href="/builder"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Assignment
            </Link>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-gray-400 text-base">No submissions yet.</div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Student</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Submitted</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">AI Score</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">Final Score</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Canvas Sync</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((s) => (
                  <tr key={s.submissionId} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {s.studentName ?? 'Unknown student'}
                      </div>
                      {s.studentEmail && (
                        <div className="text-xs text-gray-400">{s.studentEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {s.submittedAt ? formatDate(s.submittedAt) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {s.aiGrade !== null ? `${s.aiGrade} / ${assignment.pointsPossible}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-semibold text-gray-900">
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
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
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
    return <span className="text-xs text-gray-400">—</span>
  }
  const styles = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${styles[status]}`}>
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
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
