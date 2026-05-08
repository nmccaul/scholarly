'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoLoginClient() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [institution, setInstitution] = useState('')
  const [interests, setInterests] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, institution, interests }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-bold tracking-tight">S</div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            See it in action
          </h1>
          <p className="text-sm text-slate-500">
            AI-powered oral assessments that live inside Canvas.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                maxLength={200}
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@university.edu"
                required
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Institution <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University of Utah"
                required
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What assignment types interest you?
                <span className="ml-1 text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. debates, written essays, peer review, language practice…"
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim() || !institution.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Setting up your demo…
                </>
              ) : (
                'Get Demo Access'
              )}
            </button>

          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          By continuing you agree to our{' '}
          <a href="/privacy" className="underline hover:text-slate-600">Privacy Policy</a>.
        </p>

      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
