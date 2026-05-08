import Link from 'next/link'
import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { getSubmissionAsTeacher, listSubmissionsForAssignment } from '@/lib/submissions/repository'
import { createSignedDownloadUrl } from '@/lib/storage/recordings'
import GradeOverrideForm from './GradeOverrideForm'
import type { AssignmentId, SubmissionId } from '@/types/domain'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/dashboard/${assignmentId}`}
              className="text-sm font-medium text-[#6B7280] hover:text-[#18202A]"
            >
              ← All submissions
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {currentIndex >= 0 && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#8A8F98]">
                  {currentIndex + 1} of {submittedOnly.length}
                </span>
              )}
              <Link
                href={prevSubmission ? `/dashboard/${assignmentId}/${prevSubmission.submissionId}` : '#'}
                aria-disabled={!prevSubmission}
                className={prevSubmission
                  ? 'px-3 py-1.5 rounded-lg border border-[#E3E0D8] bg-white text-[#374151] hover:bg-[#FAF9F6] transition-colors'
                  : 'px-3 py-1.5 rounded-lg border border-[#EEEAE2] bg-[#FAF9F6] text-[#AEB8C2] pointer-events-none'}
              >
                ← Prev
              </Link>
              <Link
                href={nextSubmission ? `/dashboard/${assignmentId}/${nextSubmission.submissionId}` : '#'}
                aria-disabled={!nextSubmission}
                className={nextSubmission
                  ? 'px-3 py-1.5 rounded-lg border border-[#E3E0D8] bg-white text-[#374151] hover:bg-[#FAF9F6] transition-colors'
                  : 'px-3 py-1.5 rounded-lg border border-[#EEEAE2] bg-[#FAF9F6] text-[#AEB8C2] pointer-events-none'}
              >
                Next →
              </Link>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">
            {submission.studentName ?? 'Unknown student'}
          </h1>
          <div className="text-sm text-[#6B7280] mt-1">
            {submission.studentEmail && <span>{submission.studentEmail} &middot; </span>}
            {assignment.title} &middot;{' '}
            {submission.submittedAt ? formatDate(submission.submittedAt) : 'Not yet submitted'}
          </div>
        </div>

        {/* Video player */}
        {recordingUrl && (
          <section className="mb-8">
            <h2 className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-3">
              Recording
            </h2>
            <video
              src={recordingUrl}
              controls
              className="w-full rounded-lg bg-black aspect-video"
            />
          </section>
        )}

        {/* Transcript */}
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-3">
            Transcript
          </h2>
          {submission.transcript ? (
            <div className="bg-white border border-[#E3E0D8] rounded-lg p-5 text-sm text-[#24313F] leading-relaxed whitespace-pre-wrap">
              {submission.transcript}
            </div>
          ) : (
            <div className="bg-white border border-[#E3E0D8] rounded-lg p-5 text-sm text-[#8A8F98]">
              No transcript available.
            </div>
          )}
        </section>

        {/* Follow-up exchanges */}
        {submission.followUpExchanges.length > 0 && (
          <section className="mb-8">
            <h2 className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-3">
              Follow-up Exchanges
            </h2>
            <div className="space-y-3">
              {submission.followUpExchanges.map((e, i) => (
                <div key={i} className="bg-white border border-[#E3E0D8] rounded-lg p-4">
                  <div className="font-mono text-[11px] font-semibold text-[#2563A6] mb-2 uppercase tracking-wider">
                    Q{i + 1}: {e.question}
                  </div>
                  <div className="text-sm text-[#374151]">{e.answerTranscript || '(no answer)'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI grade breakdown */}
        {submission.aiGradeRationale && (
          <section className="mb-8">
            <h2 className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-3">
              AI Grade Breakdown
              {submission.aiGrade !== null && (
                <span className="ml-2 text-[#8A8F98] font-normal normal-case">
                  {submission.aiGrade} / {assignment.pointsPossible} pts
                </span>
              )}
            </h2>
            <div className="space-y-2 mb-4">
              {submission.aiGradeRationale.criteriaScores.map((s, i) => (
                <div key={i} className="bg-white border border-[#E3E0D8] rounded-lg p-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-[#18202A] text-sm">{s.label}</span>
                    <span className="font-mono text-xs text-[#6B7280] tabular-nums">{s.score} pts</span>
                  </div>
                  <p className="text-sm text-[#6B7280]">{s.rationale}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E3E0D8] rounded-lg p-4">
              <div className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-1">
                Overall Feedback
              </div>
              <p className="text-sm text-[#24313F] leading-relaxed">
                {submission.aiGradeRationale.overallFeedback}
              </p>
            </div>
          </section>
        )}

        {/* Grade override */}
        <section className="bg-white border border-[#E3E0D8] rounded-lg p-6">
          <h2 className="font-mono text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-4">
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
      <p className="text-[#6B7280]">{message}</p>
    </div>
  )
}
