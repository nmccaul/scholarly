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

  const overviewNav = NAV.find((n) => n.href === '/dashboard')!
  const materialsNav = NAV.find((n) => n.href === '/dashboard/materials')!

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[#E3E0D8] bg-[#24313F] sticky top-0 h-screen overflow-y-auto">

      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#18202A] text-[10px] font-bold shrink-0">
            S
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">scholarly</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col">

        {/* Overview */}
        <NavItem
          href={overviewNav.href}
          label={overviewNav.label}
          icon={overviewNav.icon}
          active={isActive(overviewNav.href, overviewNav.exact)}
        />

        {/* Assignments section */}
        <div className="mt-4">
          <p className="px-3 mb-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-white/30">
            Assignments
          </p>
          <div className="space-y-0.5">
            {assignments.map((a) => {
              const active = isAssignmentActive(a.id)
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/${a.id}`}
                  title={a.title}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors truncate ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-[#A8BAC8] hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-white/25'}`} />
                  <span className="truncate">{a.title}</span>
                </Link>
              )
            })}
          </div>

          {/* New Assignment */}
          <Link
            href="/builder"
            className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New assignment
          </Link>
        </div>

        {/* Bottom section */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <NavItem
            href={materialsNav.href}
            label={materialsNav.label}
            icon={materialsNav.icon}
            active={isActive(materialsNav.href, materialsNav.exact)}
          />
        </div>

      </nav>
    </aside>
  )
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-[#18202A]'
          : 'text-[#D7E8F5] hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className={active ? 'text-[#18202A]' : 'text-[#AEB8C2]'}>{icon}</span>
      {label}
    </Link>
  )
}
