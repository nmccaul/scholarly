'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CreateOralAssessmentRequest, CreateAssignmentResponse, RubricCriterionInput, GenerateAssignmentResponse } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const DEFAULT_FORM: FormState = {
  title: '',
  prompt: '',
  preparationTimeSeconds: 60,
  maxResponseTimeSeconds: 180,
  followUpQuestionCount: 2,
  cameraRequired: true,
  aiGradingEnabled: true,
  rubric: [{ label: '', description: '', maxPoints: 10 }],
  selectedMaterialIds: [],
  assignmentMaterials: [],
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuilderClient({
  returnUrl,
  dlData,
  isDevMode = false,
  courseMaterials = [],
}: {
  returnUrl: string
  dlData?: string
  isDevMode?: boolean
  courseMaterials?: Array<{ id: string; title: string; content: string }>
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null)
  const [addingMaterial, setAddingMaterial] = useState(false)
  const [direction, setDirection] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const canGenerate =
    !generating &&
    (form.selectedMaterialIds.length > 0 || form.assignmentMaterials.length > 0)

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/assignments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialIds: form.selectedMaterialIds,
          assignmentMaterials: form.assignmentMaterials,
          direction,
        }),
      })
      const data = await res.json().catch(() => ({})) as GenerateAssignmentResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setForm((f) => ({ ...f, title: data.title, prompt: data.prompt, rubric: data.rubric }))
      setErrors({})
      setGenerated(true)
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const totalPoints = form.rubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function addCriterion() {
    if (form.rubric.length >= 6) return
    setForm((prev) => ({
      ...prev,
      rubric: [...prev.rubric, { label: '', description: '', maxPoints: 10 }],
    }))
  }

  function removeCriterion(index: number) {
    if (form.rubric.length <= 1) return
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.filter((_, i) => i !== index),
    }))
  }

  function updateCriterion(index: number, field: keyof RubricCriterionInput, value: string | number) {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }))
  }

  function clientValidate(): boolean {
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
    if (!clientValidate()) return
    setSubmitting(true)
    setApiError(null)

    try {
      const body: CreateOralAssessmentRequest = {
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
        returnUrl,
        dlData,
      }

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setApiError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      const data: CreateAssignmentResponse = await res.json()
      if (isDevMode) {
        setCreatedAssignmentId(data.assignmentId)
      } else {
        returnToCanvas(data.jwt, data.returnUrl)
      }
    } catch {
      setApiError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function backToTypePicker() {
    if (isDevMode) {
      router.push('/builder')
      return
    }
    const params = new URLSearchParams({ return_url: returnUrl })
    if (dlData) params.set('dl_data', dlData)
    router.push(`/builder?${params.toString()}`)
  }

  if (createdAssignmentId) {
    return (
      <div className="flex items-center justify-center py-24 px-8">
        <div className="max-w-md w-full rounded-xl border border-[#E3E0D8] bg-white p-8 shadow-sm text-center">
          <div className="text-3xl mb-3">✓</div>
          <h1 className="text-lg font-semibold text-[#18202A] mb-1">Assignment created</h1>
          <p className="text-sm text-[#6B7280] mb-1">Dev mode — Canvas redirect skipped.</p>
          <p className="text-xs text-[#8A8F98] font-mono mb-6 break-all">{createdAssignmentId}</p>
          <div className="flex flex-col gap-2">
            <a
              href={`/assess/${createdAssignmentId}`}
              className="block w-full rounded-lg bg-[#2563A6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
            >
              Preview as Student
            </a>
            <a
              href={`/dashboard/${createdAssignmentId}`}
              className="block w-full rounded-lg border border-[#E3E0D8] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors"
            >
              View Submissions
            </a>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg border border-[#E3E0D8] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors"
            >
              All Assignments
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={backToTypePicker}
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#18202A] transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <span className="text-[#AEB8C2]">|</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#2563A6]">OA</span>
            <h1 className="text-lg font-semibold text-[#18202A]">Oral Assessment</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Generate with AI */}
          <div className="mb-6 overflow-hidden rounded-lg border border-[#D4CEC3] bg-white">
            <div className="border-b border-[#E3E0D8] bg-[#24313F] px-6 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#7DB7D9] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-white">Generate with AI</h2>
              </div>
            </div>

            <div className="p-6">

            {courseMaterials.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-[#6B7280]">Select materials to base the assignment on</p>
                <div className="space-y-2">
                  {courseMaterials.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.selectedMaterialIds.includes(m.id)}
                        onChange={(e) =>
                          updateField(
                            'selectedMaterialIds',
                            e.target.checked
                              ? [...form.selectedMaterialIds, m.id]
                              : form.selectedMaterialIds.filter((id) => id !== m.id)
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-[#D4CEC3] text-[#18202A] focus:ring-[#2563A6]"
                      />
                      <span className="text-sm text-[#374151]">{m.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.assignmentMaterials.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-[#6B7280]">Uploaded for this assignment</p>
                <div className="space-y-2">
                  {form.assignmentMaterials.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md border border-[#E3E0D8] bg-[#FAF9F6] px-3 py-2"
                    >
                      <span className="text-sm text-[#374151]">{m.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            assignmentMaterials: prev.assignmentMaterials.filter((_, j) => j !== i),
                          }))
                        }
                        className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
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
                <button
                  type="button"
                  onClick={() => setAddingMaterial(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors"
                >
                  <span className="text-base leading-none">+</span>
                  Upload new material
                </button>
              )}
            </div>

            {courseMaterials.length === 0 && form.assignmentMaterials.length === 0 && (
              <p className="mb-4 text-sm text-[#6B7280]">
                Upload material here, or{' '}
                <a href="/dashboard/materials" target="_blank" rel="noreferrer" className="text-[#2563A6] hover:underline">
                  add to your course library
                </a>{' '}
                for reuse later.
              </p>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                Direction <span className="text-[#8A8F98] font-normal">(optional)</span>
              </label>
              <textarea
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="e.g. Focus on judicial review and the limits of legislative power"
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-2 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none"
              />
            </div>

            {generateError && (
              <p className="mb-3 text-sm text-[#C2413A]">{generateError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex items-center gap-2 rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Spinner />
                    Generating…
                  </>
                ) : generated ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Assignment
                  </>
                )}
              </button>
              {generated && (
                <span className="text-xs text-[#6B7280]">Fields filled below. Edit freely before saving.</span>
              )}
            </div>
            </div>
          </div>

          {/* Assignment Details */}
          <Section title="Assignment Details">
            <Field label="Title" error={errors.title} required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Chapter 5 Oral Response"
                maxLength={200}
                className={input(errors.title)}
              />
            </Field>
            <Field label="Prompt" hint="What should the student respond to?" error={errors.prompt} required>
              <textarea
                value={form.prompt}
                onChange={(e) => updateField('prompt', e.target.value)}
                placeholder="e.g. Explain the causes of the French Revolution and their significance."
                rows={4}
                maxLength={2000}
                className={input(errors.prompt) + ' resize-none'}
              />
              <p className="mt-1 text-right font-mono text-[11px] text-[#8A8F98]">{form.prompt.length}/2000</p>
            </Field>
          </Section>

          {/* Recording Settings */}
          <Section title="Recording Settings">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prep time (sec)">
                <input
                  type="number"
                  value={form.preparationTimeSeconds}
                  onChange={(e) => updateField('preparationTimeSeconds', Math.min(300, Math.max(0, +e.target.value)))}
                  min={0}
                  max={300}
                  className={input()}
                />
              </Field>
              <Field label="Response limit (sec)">
                <input
                  type="number"
                  value={form.maxResponseTimeSeconds}
                  onChange={(e) => updateField('maxResponseTimeSeconds', Math.min(600, Math.max(30, +e.target.value)))}
                  min={30}
                  max={600}
                  className={input()}
                />
              </Field>
              <Field label="Follow-up questions">
                <input
                  type="number"
                  value={form.followUpQuestionCount}
                  onChange={(e) => updateField('followUpQuestionCount', Math.min(5, Math.max(0, +e.target.value)))}
                  min={0}
                  max={5}
                  className={input()}
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-6">
              <Toggle
                label="Require camera"
                checked={form.cameraRequired}
                onChange={(v) => updateField('cameraRequired', v)}
              />
              <Toggle
                label="AI grading"
                checked={form.aiGradingEnabled}
                onChange={(v) => updateField('aiGradingEnabled', v)}
              />
            </div>
          </Section>

          {/* Rubric */}
          <Section
            title="Rubric"
            action={
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                Total <strong className="text-[#18202A]">{totalPoints} pts</strong>
              </span>
            }
          >
            <div className="space-y-3">
              {form.rubric.map((criterion, index) => (
                <div key={index} className="rounded-lg border border-[#E3E0D8] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#8A8F98]">
                      Criterion {index + 1}
                    </span>
                    {form.rubric.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriterion(index)}
                        className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none"
                        aria-label="Remove criterion"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Label</label>
                      <input
                        type="text"
                        value={criterion.label}
                        onChange={(e) => updateCriterion(index, 'label', e.target.value)}
                        placeholder="e.g. Clarity"
                        maxLength={100}
                        className={input(errors[`rubric_${index}_label`])}
                      />
                      {errors[`rubric_${index}_label`] && (
                        <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_label`]}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Description</label>
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                        placeholder="e.g. Response is clear and well-organized"
                        maxLength={500}
                        className={input(errors[`rubric_${index}_description`])}
                      />
                      {errors[`rubric_${index}_description`] && (
                        <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_description`]}</p>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Max points</label>
                      <input
                        type="number"
                        value={criterion.maxPoints}
                        onChange={(e) => updateCriterion(index, 'maxPoints', Math.min(100, Math.max(1, +e.target.value)))}
                        min={1}
                        max={100}
                        className={input(errors[`rubric_${index}_points`])}
                      />
                      {errors[`rubric_${index}_points`] && (
                        <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_points`]}</p>
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
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Add criterion
              </button>
            )}
          </Section>

          {/* Submit */}
          {apiError && (
            <div className="mb-4 rounded-lg border border-[#E7B8B4] bg-[#FBEDEA] px-4 py-3 text-sm text-[#C2413A]">
              {apiError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-[#2563A6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Creating assignment…
                </>
              ) : (
                <>
                  Create Assignment
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-6 rounded-lg border border-[#E3E0D8] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1 block text-sm font-medium text-[#374151]">
        {label}
        {required && <span className="ml-0.5 text-[#C2413A]">*</span>}
      </label>
      {hint && <p className="mb-1 text-xs text-[#8A8F98]">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-[#C2413A]">{error}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-[#374151]"
    >
      <div
        className={[
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-[#2563A6]' : 'bg-[#D7D2C8]',
        ].join(' ')}
      >
        <div
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </div>
      {label}
    </button>
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
    <div className="mt-2 rounded-lg border border-[#E3E0D8] bg-[#FAF9F6] p-4">
      {/* Source type tabs */}
      <div className="mb-3 flex gap-1 rounded-md bg-[#E3E0D8] p-0.5 w-fit">
        {(['text', 'url', 'pdf'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setSource(s); setError(null) }}
            className={[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              source === s
                ? 'bg-[#2563A6] text-white'
                : 'text-[#6B7280] hover:text-[#374151]',
            ].join(' ')}
          >
            {s === 'text' ? 'Text' : s === 'url' ? 'Link' : 'PDF'}
          </button>
        ))}
      </div>

      {source === 'text' && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Reading"
              maxLength={200}
              autoFocus
              className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the reading or context here…"
              rows={5}
              maxLength={50000}
              className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none"
            />
            <p className="mt-0.5 text-right font-mono text-[11px] text-[#8A8F98]">
              {content.length.toLocaleString()} / 50,000
            </p>
          </div>
        </>
      )}

      {source === 'url' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]"
          />
          <p className="mt-0.5 text-xs text-[#8A8F98]">Title and text extracted automatically.</p>
        </div>
      )}

      {source === 'pdf' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">PDF file</label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[#E3E0D8] file:text-[#374151] hover:file:bg-[#D7D2C8] file:cursor-pointer"
          />
          {file && <p className="mt-1 text-xs text-[#6B7280]">{file.name}</p>}
          <p className="mt-0.5 text-xs text-[#8A8F98]">Max 5 MB. Text extracted automatically.</p>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-[#C2413A]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563A6] rounded-md hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading && <Spinner />}
          {addLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-[#6B7280] border border-[#E3E0D8] rounded-md hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function input(error?: string) {
  return [
    'w-full rounded-md border px-3 py-2 text-sm text-[#18202A] outline-none transition-colors',
    'placeholder:text-[#8A8F98]',
    'focus:ring-2 focus:ring-[#2563A6] focus:border-transparent',
    error ? 'border-[#C2413A] bg-[#FBEDEA]' : 'border-[#E3E0D8] bg-white hover:border-[#D4CEC3]',
  ].join(' ')
}

// Submits the Deep Link response JWT back to Canvas via form POST
function returnToCanvas(jwt: string, returnUrl: string) {
  const parsed = new URL(returnUrl)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`returnUrl has unexpected protocol: ${parsed.protocol}`)
  }
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = parsed.href // use the parsed href, not the raw string
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'JWT'
  input.value = jwt
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}
