import TeacherSidebar from './TeacherSidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
