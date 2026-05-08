import AppShell from '@/components/AppShell'
import { listAssignmentsForCourse } from '@/lib/assignments/repository'
import { requireInstructor } from '@/lib/lti/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let assignments: Array<{ id: string; title: string }> = []

  try {
    const session = await requireInstructor()
    const courseAssignments = await listAssignmentsForCourse(session.courseId)
    assignments = courseAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
    }))
  } catch {
    assignments = []
  }

  return <AppShell assignments={assignments}>{children}</AppShell>
}
