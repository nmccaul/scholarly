import { requireInstructor, SessionError } from '@/lib/lti/session'
import { findAssignmentWithConfig, findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { listCourseMaterials, listAssignmentMaterials } from '@/lib/materials/repository'
import EditAssignmentClient, { type ClientAssignmentForEdit } from './EditAssignmentClient'
import EditReadingAssignmentClient, { type ClientReadingAssignmentForEdit } from './EditReadingAssignmentClient'
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

  const id = assignmentId as AssignmentId

  // Try oral assessment first, then reading
  const oral = await findAssignmentWithConfig(id)
  if (oral && oral.courseId === session.courseId) {
    const [courseMaterials, assignmentMaterials] = await Promise.all([
      listCourseMaterials(session.courseId),
      listAssignmentMaterials(oral.id),
    ])
    const clientAssignment: ClientAssignmentForEdit = {
      id: oral.id,
      title: oral.title,
      config: oral.config,
      assignmentMaterials: assignmentMaterials.map((m) => ({ title: m.title, content: m.content })),
    }
    return (
      <EditAssignmentClient
        assignment={clientAssignment}
        courseMaterials={courseMaterials.map((m) => ({ id: m.id, title: m.title, content: m.content }))}
      />
    )
  }

  const reading = await findReadingAssignmentWithConfig(id)
  if (reading && reading.courseId === session.courseId) {
    const clientAssignment: ClientReadingAssignmentForEdit = {
      id: reading.id,
      title: reading.title,
      config: reading.config,
    }
    return <EditReadingAssignmentClient assignment={clientAssignment} />
  }

  return <ErrorPage message="Assignment not found." />
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
