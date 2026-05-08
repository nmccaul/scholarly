'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AssignmentId } from '@/types/domain'
import type { UpdateOralAssessmentRequest, RubricCriterionInput } from '@/types/api'

export interface ClientAssignmentForEdit {
  id: AssignmentId
  title: string
  config: {
    prompt: string
    preparationTimeSeconds: number
    maxResponseTimeSeconds: number
    followUpQuestionCount: number
    cameraRequired: boolean
    aiGradingEnabled: boolean
    rubric: Array<{ label: string; description: string; maxPoints: number }>
    selectedMaterialIds: string[]
  }
  assignmentMaterials: Array<{ title: string; content: string }>
}

interface AssignmentMaterialDraft {
  title: string
  content: string
}

interface FormState {
  title: string
  prompt: string
  preparationTimeSeconds: number
  maxResponseTimeSeconds: number
  followUpQuestionCount: number
  cameraRequired: boolean
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds: string[]
  assignmentMaterials: AssignmentMaterialDraft[]
}

export default function EditAssignmentClient({
  assignment,
  courseMaterials = [],
}: {
  assignment: ClientAssignmentForEdit
  courseMaterials?: Array<{ id: string; title: string; content: string }>
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    title: assignment.title,
    prompt: assignment.config.prompt,
    preparationTimeSeconds: assignment.config.preparationTimeSeconds,
    maxResponseTimeSeconds: assignment.config.maxResponseTimeSeconds,
    followUpQuestionCount: assignment.config.followUpQuestionCount,
    cameraRequired: assignment.config.cameraRequired,
    aiGradingEnabled: assignment.config.aiGradingEnabled,
    rubric: assignment.config.rubric.map((c) => ({
      label: c.label,
      description: c.description,
      maxPoints: c.maxPoints,
    })),
    selectedMaterialIds: assignment.config.selectedMaterialIds,
    assignmentMaterials: assignment.assignmentMaterials,
  })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [addingMaterial, setAddingMaterial] = useState(false)

  const totalPoints = form.rubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function addCriterion() {
    if (form.rubric.length >= 6) return
    setForm((prev) => ({ ...prev, rubric: [...prev.rubric, { label: '', description: '', maxPoints: 10 }] }))
  }

  function removeCriterion(index: number) {
    if (form.rubric.length <= 1) return
    setForm((prev) => ({ ...prev, rubric: prev.rubric.filter((_, i) => i !== index) }))
  }

  function updateCriterion(index: number, field: keyof RubricCriterionInput, value: string | number) {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }))
  }

  function validate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = 'Required'
    else if (form.title.length > 200) next.title = 'Max 200 characters'
    if (!form.prompt.trim()) next.prompt = 'Required'
    else if (form.prompt.length < 10) next.prompt = 'At least 10 characters'
    else if (form.prompt.length > 2000) next.prompt = 'Max 2000 characters'
    form.rubric.forEach((c, i) => {
      if (!c.label.trim()) next[`rubric_${i}_label`] = 'Required'
      if (!c.description.trim()) next[`rubric_${i}_description`] = 'Required'
      if (!c.maxPoints || c.maxPoints < 1) next[`rubric_${i}_points`] = 'Min 1'
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)

    try {
      const body: UpdateOralAssessmentRequest = {
        title: form.title.trim(),
        prompt: form.prompt.trim(),
        preparationTimeSeconds: form.preparationTimeSeconds,
        maxResponseTimeSeconds: form.maxResponseTimeSeconds,
        followUpQuestionCount: form.followUpQuestionCount,
        cameraRequired: form.cameraRequired,
        aiGradingEnabled: form.aiGradingEnabled,
        rubric: form.rubric,
        selectedMaterialIds: form.selectedMaterialIds,
        assignmentMaterials: form.assignmentMaterials,
      }

      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setApiError(data.error ?? 'Something went wrong.')
        return
      }

      router.push(`/dashboard/${assignment.id}`)
      router.refresh()
    } catch {
      setApiError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${assignment.id}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎤</span>
            <h1 className="text-lg font-semibold text-slate-900">Edit Assignment</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Section title="Assignment Details">
            <Field label="Title" error={errors.title} required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                maxLength={200}
                className={input(errors.title)}
              />
            </Field>
            <Field label="Prompt" hint="What should the student respond to?" error={errors.prompt} required>
              <textarea
                value={form.prompt}
                onChange={(e) => updateField('prompt', e.target.value)}
                rows={4}
                maxLength={2000}
                className={input(errors.prompt) + ' resize-none'}
              />
              <p className="mt-1 text-right text-xs text-slate-400">{form.prompt.length}/2000</p>
            </Field>
          </Section>

          <Section title="Recording Settings">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prep time (sec)">
                <input
                  type="number"
                  value={form.preparationTimeSeconds}
                  onChange={(e) => updateField('preparationTimeSeconds', Math.min(300, Math.max(0, +e.target.value)))}
                  min={0} max={300}
                  className={input()}
                />
              </Field>
              <Field label="Response limit (sec)">
                <input
                  type="number"
                  value={form.maxResponseTimeSeconds}
                  onChange={(e) => updateField('maxResponseTimeSeconds', Math.min(600, Math.max(30, +e.target.value)))}
                  min={30} max={600}
                  className={input()}
                />
              </Field>
              <Field label="Follow-up questions">
                <input
                  type="number"
                  value={form.followUpQuestionCount}
                  onChange={(e) => updateField('followUpQuestionCount', Math.min(5, Math.max(0, +e.target.value)))}
                  min={0} max={5}
                  className={input()}
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-6">
              <Toggle label="Require camera" checked={form.cameraRequired} onChange={(v) => updateField('cameraRequired', v)} />
              <Toggle label="AI grading" checked={form.aiGradingEnabled} onChange={(v) => updateField('aiGradingEnabled', v)} />
            </div>
          </Section>

          <Section
            title="Context Materials"
            action={
              <span className="text-xs text-slate-400">Optional — gives the AI reading context when grading</span>
            }
          >
            {courseMaterials.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-slate-500">Course library</p>
                <div className="space-y-2">
                  {courseMaterials.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.selectedMaterialIds.includes(m.id)}
                        onChange={(e) => {
                          updateField(
                            'selectedMaterialIds',
                            e.target.checked
                              ? [...form.selectedMaterialIds, m.id]
                              : form.selectedMaterialIds.filter((id) => id !== m.id)
                          )
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600"
                      />
                      <span className="text-sm text-slate-700">{m.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.assignmentMaterials.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-slate-500">For this assignment only</p>
                <div className="space-y-2">
                  {form.assignmentMaterials.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">{m.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            assignmentMaterials: prev.assignmentMaterials.filter((_, j) => j !== i),
                          }))
                        }
                        className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addingMaterial ? (
              <InlineMaterialForm
                onAdd={(m) => {
                  setForm((prev) => ({
                    ...prev,
                    assignmentMaterials: [...prev.assignmentMaterials, m],
                  }))
                  setAddingMaterial(false)
                }}
                onCancel={() => setAddingMaterial(false)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAddingMaterial(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  <span className="text-base leading-none">+</span>
                  Add material for this assignment
                </button>
                {courseMaterials.length === 0 && (
                  <a
                    href="/dashboard/materials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Manage course library →
                  </a>
                )}
              </div>
            )}
          </Section>

          <Section
            title="Rubric"
            action={
              <span className="text-sm font-medium text-slate-600">
                Total: <strong className="text-slate-900">{totalPoints} pts</strong>
              </span>
            }
          >
            <div className="space-y-3">
              {form.rubric.map((criterion, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Criterion {index + 1}
                    </span>
                    {form.rubric.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriterion(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Label</label>
                      <input
                        type="text"
                        value={criterion.label}
                        onChange={(e) => updateCriterion(index, 'label', e.target.value)}
                        maxLength={100}
                        className={input(errors[`rubric_${index}_label`])}
                      />
                      {errors[`rubric_${index}_label`] && (
                        <p className="mt-0.5 text-xs text-red-500">{errors[`rubric_${index}_label`]}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                        maxLength={500}
                        className={input(errors[`rubric_${index}_description`])}
                      />
                      {errors[`rubric_${index}_description`] && (
                        <p className="mt-0.5 text-xs text-red-500">{errors[`rubric_${index}_description`]}</p>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Max points</label>
                      <input
                        type="number"
                        value={criterion.maxPoints}
                        onChange={(e) => updateCriterion(index, 'maxPoints', Math.min(100, Math.max(1, +e.target.value)))}
                        min={1} max={100}
                        className={input(errors[`rubric_${index}_points`])}
                      />
                      {errors[`rubric_${index}_points`] && (
                        <p className="mt-0.5 text-xs text-red-500">{errors[`rubric_${index}_points`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {form.rubric.length < 6 && (
              <button
                type="button"
                onClick={addCriterion}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Add criterion
              </button>
            )}
          </Section>

          {apiError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${assignment.id}`)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint && <p className="mb-1 text-xs text-slate-400">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm text-slate-700">
      <div className={['relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-red-600' : 'bg-slate-300'].join(' ')}>
        <div className={['absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
      </div>
      {label}
    </button>
  )
}

function InlineMaterialForm({
  onAdd,
  onCancel,
}: {
  onAdd: (m: { title: string; content: string }) => void
  onCancel: () => void
}) {
  const [source, setSource] = useState<'text' | 'url' | 'pdf'>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setLoading(true)
    setError(null)
    try {
      if (source === 'text') {
        onAdd({ title: title.trim(), content: content.trim() })
        return
      }
      if (source === 'url') {
        const res = await fetch('/api/materials/extract-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to fetch URL'); return }
        onAdd({ title: data.title, content: data.content })
        return
      }
      if (source === 'pdf' && file) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/materials/extract-pdf', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to extract PDF'); return }
        onAdd({ title: data.title, content: data.content })
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canAdd =
    !loading &&
    (source === 'text' ? title.trim().length > 0 && content.trim().length > 0
      : source === 'url' ? url.trim().length > 0
      : file !== null)

  const addLabel = loading
    ? (source === 'url' ? 'Fetching…' : source === 'pdf' ? 'Extracting…' : 'Adding…')
    : 'Add'

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {/* Source type tabs */}
      <div className="mb-3 flex gap-1 rounded-md bg-slate-200 p-0.5 w-fit">
        {(['text', 'url', 'pdf'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setSource(s); setError(null) }}
            className={[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              source === s
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {s === 'text' ? 'Text' : s === 'url' ? 'Link' : 'PDF'}
          </button>
        ))}
      </div>

      {source === 'text' && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Reading"
              maxLength={200}
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the reading or context here…"
              rows={5}
              maxLength={50000}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400 resize-none"
            />
            <p className="mt-0.5 text-right text-xs text-slate-400">
              {content.length.toLocaleString()} / 50,000
            </p>
          </div>
        </>
      )}

      {source === 'url' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-400"
          />
          <p className="mt-0.5 text-xs text-slate-400">Title and text extracted automatically.</p>
        </div>
      )}

      {source === 'pdf' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">PDF file</label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 file:cursor-pointer"
          />
          {file && <p className="mt-1 text-xs text-slate-500">{file.name}</p>}
          <p className="mt-0.5 text-xs text-slate-400">Max 5 MB. Text extracted automatically.</p>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading && <Spinner />}
          {addLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function input(error?: string) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition-colors',
    'placeholder:text-slate-400',
    'focus:ring-2 focus:ring-red-500 focus:border-transparent',
    error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300',
  ].join(' ')
}
