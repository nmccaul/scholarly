'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'

interface SidebarAssignment {
  id: string
  title: string
}

export default function TeacherSidebar({
  assignments = [],
}: {
  assignments?: SidebarAssignment[]
}) {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  function isAssignmentActive(id: string) {
    const href = `/dashboard/${id}`
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-[#E3E0D8] bg-[#24313F] sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#18202A] text-[10px] font-bold shrink-0">S</div>
          <span className="text-sm font-semibold text-white tracking-tight">scholarly</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon, exact }) => {
          const active = isActive(href, exact)
          const isAssignments = href === '/dashboard'

          return (
            <div key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white text-[#18202A]'
                    : 'text-[#D7E8F5] hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={active ? 'text-[#18202A]' : 'text-[#AEB8C2]'}>
                  {icon}
                </span>
                {label}
              </Link>

              {isAssignments && assignments.length > 0 && (
                <div className="mt-1 mb-2 ml-5 border-l border-white/20 pl-2">
                  {assignments.map((assignment) => {
                    const assignmentActive = isAssignmentActive(assignment.id)
                    return (
                      <Link
                        key={assignment.id}
                        href={`/dashboard/${assignment.id}`}
                        title={assignment.title}
                        className={`block truncate rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                          assignmentActive
                            ? 'bg-[#EAF2FA]/15 text-white'
                            : 'text-[#D7E8F5] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {assignment.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="mt-3 pt-3 border-t border-white/10">
          <Link
            href="/builder"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#2563A6] hover:bg-[#1E518B] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </Link>
        </div>
      </nav>
    </aside>
  )
}
