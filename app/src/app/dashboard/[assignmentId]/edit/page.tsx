import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig } from '@/lib/assignments/repository'
import { listCourseMaterials, listAssignmentMaterials } from '@/lib/materials/repository'
import EditAssignmentClient, { type ClientAssignmentForEdit } from './EditAssignmentClient'
import type { AssignmentId } from '@/types/domain'

export const dynamic = 'force-dynamic'

export default async function EditAssignmentPage({
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

  const [courseMaterials, assignmentMaterials] = await Promise.all([
    listCourseMaterials(session.courseId),
    listAssignmentMaterials(assignment.id),
  ])

  // Strip server-only fields (ltiLineitemUrl, courseId, status) before serializing to client
  const clientAssignment: ClientAssignmentForEdit = {
    id: assignment.id,
    title: assignment.title,
    config: assignment.config,
    assignmentMaterials: assignmentMaterials.map((m) => ({ title: m.title, content: m.content })),
  }

  return (
    <EditAssignmentClient
      assignment={clientAssignment}
      courseMaterials={courseMaterials.map((m) => ({ id: m.id, title: m.title, content: m.content }))}
    />
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
