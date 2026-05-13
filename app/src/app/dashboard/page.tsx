import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { listAssignmentsForCourse } from '@/lib/assignments/repository'
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

  return (
    <div className="px-8 py-8 max-w-5xl">

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
            Course workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">Assignments</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} in this course
          </p>
          </div>
          <Link
            href="/builder"
            className="inline-flex items-center rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
          >
            New Assignment
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white border border-[#E3E0D8] rounded-lg p-16 text-center">
            <p className="text-[#6B7280] text-sm mb-4">No assignments yet.</p>
            <Link
              href="/builder"
              className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
            >
              Create your first assignment
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E3E0D8] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E0D8] bg-[#F0EEE8]">
                  <th className="text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Assignment</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Points</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Submissions</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Created</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#18202A]">{a.title}</div>
                      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#8A8F98]">
                        {a.type === 'reading_assessment' ? 'Checkpoint Reading' : 'Oral Assessment'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-[#374151]">
                      {a.pointsPossible}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-[#374151]">
                      {a.submissionCount}
                    </td>
                    <td className="px-5 py-4 text-[#6B7280]">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/dashboard/${a.id}/edit`}
                          className="text-[#6B7280] hover:text-[#18202A] font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/${a.id}`}
                          className="text-[#2563A6] hover:text-[#1E518B] font-semibold"
                        >
                          View submissions
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <DeleteAssignmentButton assignmentId={a.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-[#6B7280]">{message}</p>
    </div>
  )
}
