import { requireSession, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import AssessmentClient, { type ClientAssignment } from './AssessmentClient'
import type { AssignmentId } from '@/types/domain'

export const dynamic = 'force-dynamic'

export default async function AssessPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params

  let session
  try {
    session = await requireSession()
  } catch (e) {
    if (e instanceof SessionError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <p className="text-gray-600">Session expired. Please re-launch this assignment from Canvas.</p>
        </div>
      )
    }
    throw e
  }

  const assignment = await findAssignmentWithConfig(assignmentId as AssignmentId)
  // 404 on missing or wrong course — don't leak cross-course existence
  if (!assignment || assignment.courseId !== session.courseId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <p className="text-gray-600">Assignment not found.</p>
      </div>
    )
  }

  // Strip server-only fields (ltiLineitemUrl, courseId, status) before passing to client bundle
  const clientAssignment: ClientAssignment = {
    id: assignment.id,
    title: assignment.title,
    pointsPossible: assignment.pointsPossible,
    config: {
      prompt: assignment.config.prompt,
      preparationTimeSeconds: assignment.config.preparationTimeSeconds,
      maxResponseTimeSeconds: assignment.config.maxResponseTimeSeconds,
      followUpQuestionCount: assignment.config.followUpQuestionCount,
      cameraRequired: assignment.config.cameraRequired,
    },
  }

  return <AssessmentClient assignment={clientAssignment} isInstructor={session.role === 'instructor'} />
}
