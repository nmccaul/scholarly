import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { getSubmissionAsTeacher, listSubmissionsForAssignment } from '@/lib/submissions/repository'
import { createSignedDownloadUrl } from '@/lib/storage/recordings'
import GradeOverrideForm from './GradeOverrideForm'
import type { AssignmentId, SubmissionId } from '@/types/domain'

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>
}) {
  const { assignmentId, submissionId } = await params

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

  const [submission, allSubmissions] = await Promise.all([
    getSubmissionAsTeacher(submissionId as SubmissionId),
    listSubmissionsForAssignment(assignment.id),
  ])
  if (!submission || submission.assignmentId !== assignment.id) {
    return <ErrorPage message="Submission not found." />
  }

  const submittedOnly = allSubmissions.filter(
    (s) => s.status === 'submitted' || s.status === 'graded'
  )
  const currentIndex = submittedOnly.findIndex((s) => s.submissionId === submissionId)
  const prevSubmission = currentIndex > 0 ? submittedOnly[currentIndex - 1] : null
  const nextSubmission = currentIndex < submittedOnly.length - 1 ? submittedOnly[currentIndex + 1] : null

  const recordingUrl = submission.recordingStoragePath
    ? await createSignedDownloadUrl(submission.recordingStoragePath).catch(() => null)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/dashboard/${assignmentId}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← All submissions
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {currentIndex >= 0 && (
                <span className="text-gray-400">
                  {currentIndex + 1} of {submittedOnly.length}
                </span>
              )}
              <Link
                href={prevSubmission ? `/dashboard/${assignmentId}/${prevSubmission.submissionId}` : '#'}
                aria-disabled={!prevSubmission}
                className={prevSubmission
                  ? 'px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
                  : 'px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-300 pointer-events-none'}
              >
                ← Prev
              </Link>
              <Link
                href={nextSubmission ? `/dashboard/${assignmentId}/${nextSubmission.submissionId}` : '#'}
                aria-disabled={!nextSubmission}
                className={nextSubmission
                  ? 'px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
                  : 'px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-300 pointer-events-none'}
              >
                Next →
              </Link>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {submission.studentName ?? 'Unknown student'}
          </h1>
          <div className="text-sm text-gray-500 mt-1">
            {submission.studentEmail && <span>{submission.studentEmail} &middot; </span>}
            {assignment.title} &middot;{' '}
            {submission.submittedAt ? formatDate(submission.submittedAt) : 'Not yet submitted'}
          </div>
        </div>

        {/* Video player */}
        {recordingUrl && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recording
            </h2>
            <video
              src={recordingUrl}
              controls
              className="w-full rounded-xl bg-black aspect-video"
            />
          </section>
        )}

        {/* Transcript */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Transcript
          </h2>
          {submission.transcript ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {submission.transcript}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-400">
              No transcript available.
            </div>
          )}
        </section>

        {/* Follow-up exchanges */}
        {submission.followUpExchanges.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Follow-up Exchanges
            </h2>
            <div className="space-y-3">
              {submission.followUpExchanges.map((e, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-blue-700 mb-1">
                    Q{i + 1}: {e.question}
                  </div>
                  <div className="text-sm text-gray-700">{e.answerTranscript || '(no answer)'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI grade breakdown */}
        {submission.aiGradeRationale && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              AI Grade Breakdown
              {submission.aiGrade !== null && (
                <span className="ml-2 text-gray-400 font-normal normal-case">
                  {submission.aiGrade} / {assignment.pointsPossible} pts
                </span>
              )}
            </h2>
            <div className="space-y-2 mb-4">
              {submission.aiGradeRationale.criteriaScores.map((s, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{s.label}</span>
                    <span className="text-sm text-gray-500 tabular-nums">{s.score} pts</span>
                  </div>
                  <p className="text-sm text-gray-600">{s.rationale}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                Overall Feedback
              </div>
              <p className="text-sm text-blue-900 leading-relaxed">
                {submission.aiGradeRationale.overallFeedback}
              </p>
            </div>
          </section>
        )}

        {/* Grade override */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Grade Override
          </h2>
          <GradeOverrideForm
            submissionId={submissionId}
            currentFinalGrade={submission.finalGrade}
            currentFeedback={submission.teacherFeedback}
            pointsPossible={assignment.pointsPossible}
            syncStatus={submission.latestSyncStatus}
          />
        </section>

      </div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
