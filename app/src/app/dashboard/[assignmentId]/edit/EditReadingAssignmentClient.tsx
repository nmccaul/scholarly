'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AssignmentId, CheckpointAction, CheckpointPassMode } from '@/types/domain'
import type { UpdateReadingAssessmentRequest, RubricCriterionInput } from '@/types/api'

interface SectionDraft {
  title: string
  content: string
  sourceType?: 'text' | 'pdf'
  pdfStoragePath?: string
}

interface FormState {
  title: string
  sections: SectionDraft[]
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
}

export interface ClientReadingAssignmentForEdit {
  id: AssignmentId
  title: string
  config: {
    sections: Array<{ title: string; content: string; sourceType?: 'text' | 'pdf'; pdfStoragePath?: string }>
    checkpointType: 'text' | 'voice'
    maxFollowUps: number
    aiGradingEnabled: boolean
    rubric: Array<{ label: string; description: string; maxPoints: number }>
    checkpointPassMode: CheckpointPassMode
    checkpointActions: CheckpointAction[]
  }
}

export default function EditReadingAssignmentClient({
  assignment,
}: {
  assignment: ClientReadingAssignmentForEdit
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    title: assignment.title,
    sections: assignment.config.sections,
    checkpointType: assignment.config.checkpointType,
    maxFollowUps: assignment.config.maxFollowUps,
    aiGradingEnabled: assignment.config.aiGradingEnabled,
    rubric: assignment.config.rubric,
    checkpointPassMode: assignment.config.checkpointPassMode,
    checkpointActions: assignment.config.checkpointActions,
  })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const totalPoints = form.rubric.reduce((sum, c) => sum + (c.maxPoints || 0), 0)

  function updateSection(index: number, field: keyof SectionDraft, value: string) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }))
    setErrors((prev) => ({ ...prev, [`section_${index}_${field}`]: undefined }))
  }

  function addSection() {
    if (form.sections.length >= 20) return
    setForm((prev) => ({ ...prev, sections: [...prev.sections, { title: '', content: '' }] }))
  }

  function removeSection(index: number) {
    if (form.sections.length <= 1) return
    setForm((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }))
  }

  function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir
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

  function validate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = 'Required'
    else if (form.title.length > 200) next.title = 'Max 200 characters'
    form.sections.forEach((s, i) => {
      if (!s.title.trim()) next[`section_${i}_title`] = 'Required'
      if (s.sourceType !== 'pdf' && !s.content.trim()) next[`section_${i}_content`] = 'Required'
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
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)

    try {
      const body: UpdateReadingAssessmentRequest = {
        title: form.title.trim(),
        sections: form.sections.map((s) => ({
          title: s.title.trim(),
          content: s.content.trim(),
          ...(s.sourceType === 'pdf' ? { sourceType: 'pdf' as const, pdfStoragePath: s.pdfStoragePath } : {}),
        })),
        checkpointType: form.checkpointType,
        maxFollowUps: form.maxFollowUps,
        aiGradingEnabled: form.aiGradingEnabled,
        rubric: form.rubric,
        checkpointPassMode: form.checkpointPassMode,
        checkpointActions: form.checkpointActions,
      }

      const res = await fetch(`/api/assignments/reading/${assignment.id}`, {
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
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="mx-auto max-w-3xl px-4 py-8">

        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${assignment.id}`)}
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#18202A] transition-colors"
          >
            ← Back
          </button>
          <span className="text-[#C7C1B8]">|</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#2563A6]">CR</span>
            <h1 className="text-lg font-semibold text-[#18202A]">Edit Checkpoint Reading</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Title */}
          <Section title="Assignment Details">
            <Field label="Title" error={errors.title} required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm((p) => ({ ...p, title: e.target.value }))
                  setErrors((p) => ({ ...p, title: undefined }))
                }}
                maxLength={200}
                className={input(errors.title)}
              />
            </Field>
          </Section>

          {/* Sections */}
          <Section title={`Sections (${form.sections.length})`}>
            <div className="space-y-4">
              {form.sections.map((section, i) => (
                <div key={i} className="rounded-lg border border-[#E3E0D8] bg-[#FAF9F6] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8A8F98]">
                      Section {i + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0}
                        className="p-1 text-[#AEB8C2] hover:text-[#374151] disabled:opacity-30 transition-colors text-xs">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveSection(i, 1)} disabled={i === form.sections.length - 1}
                        className="p-1 text-[#AEB8C2] hover:text-[#374151] disabled:opacity-30 transition-colors text-xs">
                        ↓
                      </button>
                      {form.sections.length > 1 && (
                        <button type="button" onClick={() => removeSection(i)}
                          className="p-1 text-[#AEB8C2] hover:text-[#C2413A] transition-colors text-lg leading-none ml-1">
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium text-[#374151]">
                        Title<span className="ml-0.5 text-[#C2413A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(i, 'title', e.target.value)}
                        maxLength={200}
                        className={input(errors[`section_${i}_title`])}
                      />
                      {errors[`section_${i}_title`] && (
                        <p className="mt-1 text-xs text-[#C2413A]">{errors[`section_${i}_title`]}</p>
                      )}
                    </div>
                    {section.sourceType === 'pdf' && (
                      <span className="mt-7 shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">PDF</span>
                    )}
                  </div>
                  {section.sourceType === 'pdf' ? (
                    <div className="rounded-md border border-[#D4CEC3] bg-[#F0EEE8] px-3 py-2.5">
                      <p className="text-xs text-[#6B7280]">PDF section — content managed by original document.</p>
                    </div>
                  ) : (
                    <Field label="Content" error={errors[`section_${i}_content`]} required>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(i, 'content', e.target.value)}
                        rows={6}
                        className={input(errors[`section_${i}_content`]) + ' resize-y'}
                      />
                      <p className="mt-0.5 text-right text-xs text-[#8A8F98]">
                        {section.content.length.toLocaleString()} chars
                      </p>
                    </Field>
                  )}
                </div>
              ))}
            </div>
            {form.sections.length < 20 && (
              <button type="button" onClick={addSection}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors">
                + Add section
              </button>
            )}
          </Section>

          {/* Checkpoint Settings */}
          <Section title="Checkpoint Settings">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Checkpoint type">
                <div className="flex gap-2">
                  {(['text', 'voice'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, checkpointType: t }))}
                      className={[
                        'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                        form.checkpointType === t
                          ? 'bg-[#2563A6] text-white border-[#2563A6]'
                          : 'text-[#6B7280] border-[#E3E0D8] hover:border-[#AEB8C2]',
                      ].join(' ')}
                    >
                      {t === 'text' ? 'Text' : 'Voice'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Max follow-ups per section">
                <input
                  type="number"
                  value={form.maxFollowUps}
                  onChange={(e) => setForm((p) => ({ ...p, maxFollowUps: Math.min(5, Math.max(0, +e.target.value)) }))}
                  min={0} max={5}
                  className={input()}
                />
              </Field>
            </div>
            <Toggle
              label="AI grading enabled"
              checked={form.aiGradingEnabled}
              onChange={(v) => setForm((p) => ({ ...p, aiGradingEnabled: v }))}
            />
          </Section>

          {/* Rubric */}
          <Section
            title="Rubric"
            action={
              <span className="text-sm font-medium text-[#6B7280]">
                Total: <strong className="text-[#18202A]">{totalPoints} pts</strong>
              </span>
            }
          >
            <div className="space-y-3">
              {form.rubric.map((criterion, index) => (
                <div key={index} className="rounded-lg border border-[#E3E0D8] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#8A8F98]">
                      Criterion {index + 1}
                    </span>
                    {form.rubric.length > 1 && (
                      <button type="button" onClick={() => removeCriterion(index)}
                        className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none">
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
                        min={1} max={100}
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
              <button type="button" onClick={addCriterion}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors">
                + Add criterion
              </button>
            )}
          </Section>

          {apiError && (
            <div className="mb-4 rounded-lg border border-[#E7B8B4] bg-[#FBEDEA] px-4 py-3 text-sm text-[#C2413A]">
              {apiError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push(`/dashboard/${assignment.id}`)}
              className="px-5 py-2.5 text-sm font-semibold text-[#6B7280] hover:text-[#18202A] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-[#2563A6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
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
    <div className="mb-6 rounded-lg border border-[#E3E0D8] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#6B7280]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="mb-1 block text-sm font-medium text-[#374151]">
        {label}{required && <span className="ml-0.5 text-[#C2413A]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[#C2413A]">{error}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm text-[#374151]">
      <div className={['relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-[#2563A6]' : 'bg-[#D7D2C8]'].join(' ')}>
        <div className={['absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
      </div>
      {label}
    </button>
  )
}

function input(error?: string) {
  return [
    'w-full rounded-md border px-3 py-2 text-sm text-[#18202A] outline-none transition-colors',
    'placeholder:text-[#8A8F98]',
    'focus:ring-2 focus:ring-[#2563A6] focus:border-transparent',
    error ? 'border-[#C2413A] bg-[#FBEDEA]' : 'border-[#E3E0D8] bg-white hover:border-[#AEB8C2]',
  ].join(' ')
}
