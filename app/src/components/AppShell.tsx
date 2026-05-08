import TeacherSidebar from './TeacherSidebar'

interface AppShellAssignment {
  id: string
  title: string
}

export default function AppShell({
  children,
  assignments = [],
}: {
  children: React.ReactNode
  assignments?: AppShellAssignment[]
}) {
  return (
    <div className="flex min-h-screen bg-[#FAF9F6] text-[#18202A]">
      <TeacherSidebar assignments={assignments} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
