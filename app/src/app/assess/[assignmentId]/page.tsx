import { requireSession, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
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

  // Try oral assignment first
  const oralAssignment = await findAssignmentWithConfig(assignmentId as AssignmentId)
  if (oralAssignment) {
    if (oralAssignment.courseId !== session.courseId) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <p className="text-gray-600">Assignment not found.</p>
        </div>
      )
    }

    const clientAssignment: ClientAssignment = {
      type: 'oral_assessment',
      id: oralAssignment.id,
      title: oralAssignment.title,
      pointsPossible: oralAssignment.pointsPossible,
      config: {
        prompt: oralAssignment.config.prompt,
        preparationTimeSeconds: oralAssignment.config.preparationTimeSeconds,
        maxResponseTimeSeconds: oralAssignment.config.maxResponseTimeSeconds,
        followUpQuestionCount: oralAssignment.config.followUpQuestionCount,
        cameraRequired: oralAssignment.config.cameraRequired,
      },
    }

    return <AssessmentClient assignment={clientAssignment} isInstructor={session.role === 'instructor'} />
  }

  // Try reading assignment
  const readingAssignment = await findReadingAssignmentWithConfig(assignmentId as AssignmentId)
  if (!readingAssignment || readingAssignment.courseId !== session.courseId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <p className="text-gray-600">Assignment not found.</p>
      </div>
    )
  }

  const clientAssignment: ClientAssignment = {
    type: 'reading_assessment',
    id: readingAssignment.id,
    title: readingAssignment.title,
    pointsPossible: readingAssignment.pointsPossible,
    config: {
      sections: readingAssignment.config.sections,
      checkpointType: readingAssignment.config.checkpointType,
      maxFollowUps: readingAssignment.config.maxFollowUps,
      aiGradingEnabled: readingAssignment.config.aiGradingEnabled,
      rubric: readingAssignment.config.rubric,
    },
  }

  return <AssessmentClient assignment={clientAssignment} isInstructor={session.role === 'instructor'} />
}
