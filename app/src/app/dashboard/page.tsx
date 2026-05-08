import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { listAssignmentsForCourse } from '@/lib/assignments/repository'
import DeleteAssignmentButton from './DeleteAssignmentButton'

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
    <div className="px-8 py-8 max-w-4xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} in this course
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
            <p className="text-slate-400 text-base mb-4">No assignments yet.</p>
            <Link
              href="/builder"
              className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Create your first assignment
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Assignment</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500">Points</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500">Submissions</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Created</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Oral Assessment</div>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {a.pointsPossible}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {a.submissionCount}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/dashboard/${a.id}/edit`}
                          className="text-slate-500 hover:text-slate-800 font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/${a.id}`}
                          className="text-red-600 hover:text-red-700 font-medium"
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
      <p className="text-slate-600">{message}</p>
    </div>
  )
}
