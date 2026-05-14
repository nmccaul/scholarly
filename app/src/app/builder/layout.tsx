import AppShell from '@/components/AppShell'
import { listAssignmentsForCourse } from '@/lib/assignments/repository'
import { requireInstructor } from '@/lib/lti/session'

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  let assignments: Array<{ id: string; title: string }> = []

  try {
    const session = await requireInstructor()
    const courseAssignments = await listAssignmentsForCourse(session.courseId)
    assignments = courseAssignments.map((a) => ({ id: a.id, title: a.title }))
  } catch {
    assignments = []
  }

  return <AppShell assignments={assignments}>{children}</AppShell>
}
