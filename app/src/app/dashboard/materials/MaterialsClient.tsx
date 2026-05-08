'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Material {
  id: string
  title: string
  content: string
  createdAt: string
}

type SourceType = 'text' | 'url' | 'pdf'

export default function MaterialsClient({ initialMaterials }: { initialMaterials: Material[] }) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  const [isAdding, setIsAdding] = useState(false)
  const [source, setSource] = useState<SourceType>('text')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setSource('text')
    setDraftTitle('')
    setDraftContent('')
    setDraftUrl('')
    setDraftFile(null)
    setError(null)
  }

  async function saveMaterial(title: string, content: string) {
    const res = await fetch('/api/courses/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    const data = await res.json().catch(() => ({})) as { id?: string; error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Failed to save material')
    if (!data.id) throw new Error('Unexpected response from server')
    setMaterials((prev) => [
      { id: data.id!, title, content, createdAt: new Date().toISOString() },
      ...prev,
    ])
    resetForm()
    setIsAdding(false)
  }

  async function handleAddText() {
    const title = draftTitle.trim()
    const content = draftContent.trim()
    if (!title || !content) return
    setSaving(true)
    setError(null)
    try {
      await saveMaterial(title, content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save material')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFromUrl() {
    const url = draftUrl.trim()
    if (!url) return
    setSaving(true)
    setError(null)
    try {
      const extractRes = await fetch('/api/materials/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const extracted = await extractRes.json().catch(() => ({})) as { title?: string; content?: string; error?: string }
      if (!extractRes.ok) throw new Error(extracted.error ?? 'Failed to fetch URL')
      await saveMaterial(extracted.title ?? url, extracted.content ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch URL')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFromPdf() {
    if (!draftFile) return
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', draftFile)
      const extractRes = await fetch('/api/materials/extract-pdf', {
        method: 'POST',
        body: formData,
      })
      const extracted = await extractRes.json().catch(() => ({})) as { title?: string; content?: string; error?: string }
      if (!extractRes.ok) throw new Error(extracted.error ?? 'Failed to extract PDF')
      await saveMaterial(extracted.title ?? draftFile.name, extracted.content ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract PDF')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/courses/materials/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to remove material')
        return
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const sourceLabel = source === 'url' ? 'Fetching…' : source === 'pdf' ? 'Extracting…' : 'Saving…'
  const canAdd =
    !saving &&
    (source === 'text' ? draftTitle.trim().length > 0 && draftContent.trim().length > 0
      : source === 'url' ? draftUrl.trim().length > 0
      : draftFile !== null)

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-4xl px-8 py-8">

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-[#6B7280] hover:text-[#18202A] transition-colors mb-2 inline-block"
            >
              ← Assignments
            </Link>
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">
              Context layer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#18202A]">Course Materials</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Readings and context available to the AI across assignments.
            </p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
            >
              + Add Material
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mb-6 rounded-lg border border-[#E3E0D8] bg-white p-6">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280] mb-4">
              New Material
            </h2>

            {/* Source type tabs */}
            <div className="mb-5 flex gap-1 rounded-lg bg-[#F0EEE8] p-1 w-fit">
              {(['text', 'url', 'pdf'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSource(s); setError(null) }}
                  className={[
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                    source === s
                      ? 'bg-[#2563A6] text-white'
                      : 'text-[#6B7280] hover:text-[#18202A]',
                  ].join(' ')}
                >
                  {s === 'text' ? 'Text' : s === 'url' ? 'Link' : 'PDF'}
                </button>
              ))}
            </div>

            {source === 'text' && (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-[#374151]">Title</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Chapter 5: The French Revolution"
                    maxLength={200}
                    autoFocus
                    className="w-full rounded-md border border-[#E3E0D8] px-3 py-2 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-[#374151]">Content</label>
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Paste the reading text or context here…"
                    rows={8}
                    maxLength={50000}
                    className="w-full rounded-md border border-[#E3E0D8] px-3 py-2 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-y"
                  />
                  <p className="mt-1 text-right font-mono text-[11px] text-[#8A8F98]">
                    {draftContent.length.toLocaleString()} / 50,000
                  </p>
                </div>
              </>
            )}

            {source === 'url' && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-[#374151]">URL</label>
                <input
                  type="url"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="https://…"
                  autoFocus
                  className="w-full rounded-md border border-[#E3E0D8] px-3 py-2 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]"
                />
                <p className="mt-1 text-xs text-[#8A8F98]">
                  The page title and readable text will be extracted automatically.
                </p>
              </div>
            )}

            {source === 'pdf' && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-[#374151]">PDF file</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[#6B7280] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#F0EEE8] file:text-[#374151] hover:file:bg-[#D7D2C8] file:cursor-pointer"
                />
                {draftFile && (
                  <p className="mt-1 text-xs text-[#6B7280]">{draftFile.name}</p>
                )}
                <p className="mt-1 text-xs text-[#8A8F98]">Max 5 MB. Text will be extracted automatically.</p>
              </div>
            )}

            {error && <p className="mb-4 text-sm text-[#2563A6]">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={source === 'text' ? handleAddText : source === 'url' ? handleAddFromUrl : handleAddFromPdf}
                disabled={!canAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner />}
                {saving ? sourceLabel : 'Add Material'}
              </button>
              <button
                onClick={() => { setIsAdding(false); resetForm() }}
                className="px-4 py-2 text-sm font-medium text-[#6B7280] border border-[#E3E0D8] rounded-lg hover:bg-[#F5F2EA] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {materials.length === 0 ? (
          <div className="rounded-lg border border-[#E3E0D8] bg-white p-16 text-center">
            <p className="text-[#6B7280] mb-4">No materials yet.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2563A6] rounded-lg hover:bg-[#1E518B] transition-colors"
            >
              Add your first material
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="rounded-lg border border-[#E3E0D8] bg-white p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-medium text-[#18202A]">{m.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirmDeleteId === m.id ? (
                      <>
                        <span className="text-xs text-[#6B7280]">Remove?</span>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="text-xs font-medium text-[#C2413A] hover:text-[#9F2F2A] disabled:opacity-50 transition-colors"
                        >
                          {deletingId === m.id ? 'Removing…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-[#8A8F98] hover:text-[#6B7280] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-sm text-[#8A8F98] hover:text-[#C2413A] disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-mono text-[11px] text-[#8A8F98] mb-3">
                  {m.content.length.toLocaleString()} characters
                </p>
                <p className="text-sm text-[#6B7280] line-clamp-3">{m.content}</p>
              </div>
            ))}
          </div>
        )}

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
