import { redirect } from 'next/navigation'
import { requireSession, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { resetSubmission } from '@/lib/submissions/repository'
import { resetReadingSubmission } from '@/lib/reading/repository'
import { createServiceClient } from '@/lib/supabase/client'
import AssessmentClient, { type ClientAssignment } from './AssessmentClient'
import { createSignedPdfUrl } from '@/lib/storage/materials'
import type { AssignmentId, SubmissionId, UserId } from '@/types/domain'

export const dynamic = 'force-dynamic'

async function resetForPreview(assignmentId: AssignmentId, userId: UserId): Promise<void> {
  const db = createServiceClient()
  const { data } = await db
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', userId)
    .maybeSingle()

  if (!data) return  // no submission yet, nothing to reset

  const submissionId = (data as { id: string }).id as SubmissionId
  // Try oral first, then reading. resetSubmission and resetReadingSubmission
  // each only touch their own tables, so the wrong one is a no-op.
  const oral = await findAssignmentWithConfig(assignmentId)
  if (oral) {
    await resetSubmission(submissionId)
    return
  }
  const reading = await findReadingAssignmentWithConfig(assignmentId)
  if (reading) {
    await resetReadingSubmission(submissionId)
  }
}

export default async function AssessPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { assignmentId } = await params
  const sp = await searchParams
  const fresh = sp.fresh === '1'

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

  // Instructor "Preview as Student": reset any in-progress submission so the
  // preview always starts at section 1, then redirect to the clean URL.
  if (fresh && session.role === 'instructor') {
    await resetForPreview(assignmentId as AssignmentId, session.userId)
    redirect(`/assess/${assignmentId}`)
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

  const sectionsWithUrls = await Promise.all(
    readingAssignment.config.sections.map(async (section) => {
      if (section.sourceType === 'pdf' && section.pdfStoragePath) {
        try {
          const pdfUrl = await createSignedPdfUrl(section.pdfStoragePath)
          return { ...section, pdfUrl }
        } catch {
          return section
        }
      }
      return section
    })
  )

  const clientAssignment: ClientAssignment = {
    type: 'reading_assessment',
    id: readingAssignment.id,
    title: readingAssignment.title,
    pointsPossible: readingAssignment.pointsPossible,
    config: {
      sections: sectionsWithUrls,
      checkpointType: readingAssignment.config.checkpointType,
      maxFollowUps: readingAssignment.config.maxFollowUps,
      aiGradingEnabled: readingAssignment.config.aiGradingEnabled,
      rubric: readingAssignment.config.rubric,
      checkpointPassMode: readingAssignment.config.checkpointPassMode,
      checkpointActions: readingAssignment.config.checkpointActions,
    },
  }

  return <AssessmentClient assignment={clientAssignment} isInstructor={session.role === 'instructor'} />
}
