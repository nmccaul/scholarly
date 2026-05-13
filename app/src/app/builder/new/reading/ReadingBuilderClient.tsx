'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  CreateReadingAssessmentRequest,
  CreateAssignmentResponse,
  RubricCriterionInput,
  GenerateReadingAssignmentResponse,
} from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionDraft {
  title: string
  content: string
}

interface AssignmentMaterialDraft {
  title: string
  content: string
}

interface FormState {
  title: string
  sections: SectionDraft[]
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds: string[]
  assignmentMaterials: AssignmentMaterialDraft[]
}

const DEFAULT_FORM: FormState = {
  title: '',
  sections: [{ title: '', content: '' }],
  checkpointType: 'text',
  maxFollowUps: 3,
  aiGradingEnabled: true,
  rubric: [{ label: '', description: '', maxPoints: 10 }],
  selectedMaterialIds: [],
  assignmentMaterials: [],
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReadingBuilderClient({
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

  const totalPoints = form.rubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/assignments/reading/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialIds: form.selectedMaterialIds,
          assignmentMaterials: form.assignmentMaterials,
          direction,
        }),
      })
      const data = await res.json().catch(() => ({})) as GenerateReadingAssignmentResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setForm((f) => ({
        ...f,
        title: data.title,
        sections: data.sections,
        rubric: data.rubric,
      }))
      setErrors({})
      setGenerated(true)
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function updateSection(index: number, field: keyof SectionDraft, value: string) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }))
  }

  function addSection() {
    if (form.sections.length >= 20) return
    setForm((prev) => ({ ...prev, sections: [...prev.sections, { title: '', content: '' }] }))
  }

  function removeSection(index: number) {
    if (form.sections.length <= 1) return
    setForm((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }))
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= form.sections.length) return
    setForm((prev) => {
      const next = [...prev.sections]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return { ...prev, sections: next }
    })
  }

  function addCriterion() {
    if (form.rubric.length >= 6) return
    setForm((prev) => ({ ...prev, rubric: [...prev.rubric, { label: '', description: '', maxPoints: 5 }] }))
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

  function clientValidate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = 'Required'
    else if (form.title.length > 200) next.title = 'Max 200 characters'
    if (form.sections.length < 1) next.sections = 'At least 1 section required'
    form.sections.forEach((s, i) => {
      if (!s.title.trim()) next[`section_${i}_title`] = 'Required'
      if (!s.content.trim()) next[`section_${i}_content`] = 'Required'
    })
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
      const body: CreateReadingAssessmentRequest = {
        title: form.title.trim(),
        sections: form.sections.map((s) => ({ title: s.title.trim(), content: s.content.trim() })),
        checkpointType: form.checkpointType,
        maxFollowUps: form.maxFollowUps,
        aiGradingEnabled: form.aiGradingEnabled,
        rubric: form.rubric,
        returnUrl,
        dlData,
      }

      const res = await fetch('/api/assignments/reading', {
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
      <div className="max-w-6xl">
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
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#2563A6]">CR</span>
            <h1 className="text-lg font-semibold text-[#18202A]">Checkpoint Reading</h1>
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
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-white">Generate sections with AI</h2>
              </div>
            </div>

            <div className="p-6">
              {courseMaterials.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-[#6B7280]">Select materials to divide into sections</p>
                  <div className="space-y-2">
                    {courseMaterials.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={form.selectedMaterialIds.includes(m.id)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              selectedMaterialIds: e.target.checked
                                ? [...f.selectedMaterialIds, m.id]
                                : f.selectedMaterialIds.filter((id) => id !== m.id),
                            }))
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
                      <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-[#E3E0D8] bg-[#FAF9F6] px-3 py-2">
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
                    Upload reading material
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
                  placeholder="e.g. Focus on the economic arguments; create 3 sections with emphasis on the second chapter"
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-2 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none"
                />
              </div>

              {generateError && <p className="mb-3 text-sm text-[#C2413A]">{generateError}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex items-center gap-2 rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <><Spinner />Generating sections…</>
                  ) : generated ? (
                    <><RegenerateIcon />Regenerate</>
                  ) : (
                    <><BoltIcon />Generate Sections</>
                  )}
                </button>
                {generated && (
                  <span className="text-xs text-[#6B7280]">Sections filled below. Edit freely before saving.</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              {/* Title */}
              <Section title="Assignment Title">
                <Field label="Title" error={errors.title} required>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. The Great Gatsby — Chapter 1–3 Reading"
                    maxLength={200}
                    className={input(errors.title)}
                  />
                </Field>
              </Section>

              {/* Sections */}
              <Section
                title="Reading Sections"
                action={
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    {form.sections.length} / 20 sections
                  </span>
                }
              >
                <p className="mb-4 text-xs text-[#6B7280]">
                  Each section ends with a checkpoint. The next section is locked until the student demonstrates critical engagement.
                </p>
                <div className="space-y-4">
                  {form.sections.map((section, index) => (
                    <div key={index} className="rounded-lg border border-[#E3E0D8] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#8A8F98]">
                            Section {index + 1}
                          </span>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveSection(index, -1)}
                              disabled={index === 0}
                              className="px-1 py-0.5 text-xs text-[#8A8F98] hover:text-[#374151] disabled:opacity-30 transition-colors"
                              aria-label="Move up"
                            >↑</button>
                            <button
                              type="button"
                              onClick={() => moveSection(index, 1)}
                              disabled={index === form.sections.length - 1}
                              className="px-1 py-0.5 text-xs text-[#8A8F98] hover:text-[#374151] disabled:opacity-30 transition-colors"
                              aria-label="Move down"
                            >↓</button>
                          </div>
                        </div>
                        {form.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(index)}
                            className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none"
                            aria-label="Remove section"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                            Section title <span className="text-[#C2413A]">*</span>
                          </label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSection(index, 'title', e.target.value)}
                            placeholder="e.g. The Argument for Economic Inequality"
                            maxLength={200}
                            className={input(errors[`section_${index}_title`])}
                          />
                          {errors[`section_${index}_title`] && (
                            <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`section_${index}_title`]}</p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-[#6B7280]">
                              Content <span className="text-[#C2413A]">*</span>
                            </label>
                            <span className="font-mono text-[10px] text-[#8A8F98]">
                              {section.content.length.toLocaleString()} / 50,000
                            </span>
                          </div>
                          <textarea
                            value={section.content}
                            onChange={(e) => updateSection(index, 'content', e.target.value)}
                            placeholder="Paste the section text here…"
                            rows={6}
                            maxLength={50000}
                            className={input(errors[`section_${index}_content`]) + ' resize-y'}
                          />
                          {errors[`section_${index}_content`] && (
                            <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`section_${index}_content`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {form.sections.length < 20 && (
                  <button
                    type="button"
                    onClick={addSection}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors"
                  >
                    <span className="text-base leading-none">+</span>
                    Add section
                  </button>
                )}
              </Section>

              {/* Checkpoint settings */}
              <Section title="Checkpoint Settings">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-[#6B7280]">Checkpoint mode</p>
                    <div className="flex gap-2">
                      {(['text', 'voice'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, checkpointType: mode }))}
                          className={[
                            'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                            form.checkpointType === mode
                              ? 'border-[#2563A6] bg-[#EAF2FA] text-[#2563A6]'
                              : 'border-[#E3E0D8] bg-white text-[#6B7280] hover:border-[#AEB8C2]',
                          ].join(' ')}
                        >
                          {mode === 'text' ? 'Text' : 'Voice'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[#8A8F98]">
                      {form.checkpointType === 'text'
                        ? 'Students type their response. AI evaluates and asks adaptive follow-up questions until satisfied.'
                        : 'Students have a live voice conversation with AI. No time limit — the AI controls when the checkpoint ends.'}
                    </p>
                  </div>

                  {form.checkpointType === 'text' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                        Max follow-up questions (text mode)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={form.maxFollowUps}
                          onChange={(e) => setForm((f) => ({ ...f, maxFollowUps: +e.target.value }))}
                          className="w-32"
                        />
                        <span className="font-mono text-sm font-semibold text-[#18202A] w-4">{form.maxFollowUps}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#8A8F98]">
                        If the student doesn&apos;t pass after {form.maxFollowUps} follow-up{form.maxFollowUps !== 1 ? 's' : ''}, the section is force-unlocked and poor engagement is reflected in the grade.
                      </p>
                    </div>
                  )}

                  <Toggle
                    label="AI grading"
                    checked={form.aiGradingEnabled}
                    onChange={(v) => setForm((f) => ({ ...f, aiGradingEnabled: v }))}
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
                <p className="mb-3 text-xs text-[#8A8F98]">
                  Rubric is evaluated holistically across all checkpoint conversations at final submission.
                </p>
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
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-1">
                          <label className="mb-1 block text-xs font-medium text-[#6B7280]">Label</label>
                          <input
                            type="text"
                            value={criterion.label}
                            onChange={(e) => updateCriterion(index, 'label', e.target.value)}
                            placeholder="e.g. Analysis"
                            maxLength={100}
                            className={input(errors[`rubric_${index}_label`])}
                          />
                          {errors[`rubric_${index}_label`] && (
                            <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_label`]}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-[#6B7280]">Description</label>
                          <input
                            type="text"
                            value={criterion.description}
                            onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                            placeholder="e.g. Identifies what the text argues and evaluates the evidence"
                            maxLength={500}
                            className={input(errors[`rubric_${index}_description`])}
                          />
                          {errors[`rubric_${index}_description`] && (
                            <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_description`]}</p>
                          )}
                        </div>
                        <div className="sm:col-span-1">
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
                    <><Spinner />Creating assignment…</>
                  ) : (
                    <>Create Assignment <span>→</span></>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar preview */}
            <aside className="lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-lg border border-[#D4CEC3] bg-white shadow-sm">
                <div className="border-b border-[#E3E0D8] bg-[#FAF9F6] px-5 py-4">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#2563A6]">Teacher Preview</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#18202A]">
                    {form.title.trim() || 'Untitled assignment'}
                  </h2>
                </div>
                <div className="space-y-5 p-5">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#374151]">Student flow</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <PreviewMetric label="Sections" value={String(form.sections.length)} />
                      <PreviewMetric label="Mode" value={form.checkpointType === 'text' ? 'Text' : 'Voice'} />
                      {form.checkpointType === 'text' && (
                        <PreviewMetric label="Max follow-ups" value={String(form.maxFollowUps)} />
                      )}
                      <PreviewMetric label="AI grading" value={form.aiGradingEnabled ? 'On' : 'Off'} />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#374151]">Scaffold prompt</h3>
                    <p className="rounded-md border border-[#E3E0D8] bg-[#FAF9F6] p-3 text-xs leading-relaxed italic text-[#374151]">
                      &ldquo;In your own words, what is this section arguing, and do you find it convincing?&rdquo;
                    </p>
                    <p className="mt-1.5 text-[10px] text-[#8A8F98]">Fixed prompt — not customizable. Ensures consistent critical engagement.</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#374151]">Sections</h3>
                      <span className="text-xs text-[#6B7280]">{form.sections.length} total</span>
                    </div>
                    <div className="space-y-1.5">
                      {form.sections.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 rounded border border-[#E3E0D8] px-2.5 py-1.5">
                          <span className="font-mono text-[10px] text-[#8A8F98] shrink-0">{i + 1}</span>
                          <span className="truncate text-xs text-[#374151]">
                            {s.title.trim() || `Section ${i + 1}`}
                          </span>
                          {s.content.trim() && (
                            <span className="ml-auto font-mono text-[10px] text-[#8A8F98] shrink-0">
                              {s.content.length.toLocaleString()} ch
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#374151]">Rubric</h3>
                      <span className="text-xs font-semibold text-[#18202A]">{totalPoints} pts</span>
                    </div>
                    <div className="rounded-md border border-[#E3E0D8]">
                      {form.rubric.filter((c) => c.label.trim()).length > 0 ? (
                        <div className="divide-y divide-[#E3E0D8]">
                          {form.rubric.filter((c) => c.label.trim()).map((c, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                              <p className="text-xs font-medium text-[#18202A]">{c.label}</p>
                              <span className="shrink-0 text-xs text-[#6B7280]">{c.maxPoints} pts</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-3 text-xs text-[#6B7280]">Add rubric criteria to preview grading.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E3E0D8] bg-[#FAF9F6] px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A8F98]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#18202A]">{value}</p>
    </div>
  )
}

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
  error,
  required,
  children,
}: {
  label: string
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
      <div className={['relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-[#2563A6]' : 'bg-[#D7D2C8]'].join(' ')}>
        <div className={['absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
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

function BoltIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function RegenerateIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
        const res = await fetch('/api/materials/extract-pdf', { method: 'POST', body: formData })
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

  const canAdd = !loading && (
    source === 'text' ? title.trim().length > 0 && content.trim().length > 0
    : source === 'url' ? url.trim().length > 0
    : file !== null
  )

  return (
    <div className="mt-2 rounded-lg border border-[#E3E0D8] bg-[#FAF9F6] p-4">
      <div className="mb-3 flex gap-1 rounded-md bg-[#E3E0D8] p-0.5 w-fit">
        {(['text', 'url', 'pdf'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setSource(s); setError(null) }}
            className={['px-3 py-1 text-xs font-medium rounded transition-colors', source === s ? 'bg-[#2563A6] text-white' : 'text-[#6B7280] hover:text-[#374151]'].join(' ')}
          >
            {s === 'text' ? 'Text' : s === 'url' ? 'Link' : 'PDF'}
          </button>
        ))}
      </div>
      {source === 'text' && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5" maxLength={200} autoFocus className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]" />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the reading here…" rows={5} maxLength={50000} className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none" />
          </div>
        </>
      )}
      {source === 'url' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm text-[#18202A] outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]" />
          <p className="mt-0.5 text-xs text-[#8A8F98]">Title and text extracted automatically.</p>
        </div>
      )}
      {source === 'pdf' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">PDF file</label>
          <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[#E3E0D8] file:text-[#374151] hover:file:bg-[#D7D2C8] file:cursor-pointer" />
          {file && <p className="mt-1 text-xs text-[#6B7280]">{file.name}</p>}
        </div>
      )}
      {error && <p className="mb-2 text-xs text-[#C2413A]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={handleAdd} disabled={!canAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563A6] rounded-md hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
          {loading && <Spinner />}
          {loading ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-[#6B7280] border border-[#E3E0D8] rounded-md hover:bg-white transition-colors">Cancel</button>
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

function returnToCanvas(jwt: string, returnUrl: string) {
  const parsed = new URL(returnUrl)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`returnUrl has unexpected protocol: ${parsed.protocol}`)
  }
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = parsed.href
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'JWT'
  input.value = jwt
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}
