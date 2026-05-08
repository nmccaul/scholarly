'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'

export default function TeacherSidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white text-[10px] font-bold shrink-0">S</div>
          <span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href, exact)
                ? 'bg-red-50 text-red-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={isActive(href, exact) ? 'text-red-600' : 'text-slate-400'}>
              {icon}
            </span>
            {label}
          </Link>
        ))}

        <div className="mt-3 pt-3 border-t border-slate-100">
          <Link
            href="/builder"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
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
