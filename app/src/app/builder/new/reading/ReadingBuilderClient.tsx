'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  CreateReadingAssessmentRequest,
  CreateAssignmentResponse,
  RubricCriterionInput,
  GenerateReadingAssignmentResponse,
  ProcessPdfResponse,
} from '@/types/api'

interface AssignmentMaterialDraft {
  title: string
  content: string
}

interface FormState {
  title: string
  checkpointType: 'text' | 'voice'
  maxFollowUps: number
  aiGradingEnabled: boolean
  rubric: RubricCriterionInput[]
  selectedMaterialIds: string[]
  assignmentMaterials: AssignmentMaterialDraft[]
}

interface GeneratedSections {
  sections: GenerateReadingAssignmentResponse['sections']
  count: number
}

const DEFAULT_FORM: FormState = {
  title: '',
  checkpointType: 'voice',
  maxFollowUps: 3,
  aiGradingEnabled: true,
  rubric: [{ label: '', description: '', maxPoints: 10 }],
  selectedMaterialIds: [],
  assignmentMaterials: [],
}

export function ReadingBuilderClient({
  returnUrl,
  dlData,
  isDevMode = false,
  courseMaterials = [],
}: {
  returnUrl: string
  dlData?: string
  isDevMode?: boolean
  courseMaterials?: Array<{ id: string; title: string; content: string; pdfStoragePath?: string }>
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
  // Sections are generated silently — not shown for editing
  const [generatedSections, setGeneratedSections] = useState<GeneratedSections | null>(null)
  // PDF direct flow
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const canGenerate = !generating && (form.selectedMaterialIds.length > 0 || form.assignmentMaterials.length > 0)
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

      setForm((f) => ({ ...f, title: data.title, rubric: data.rubric }))
      setGeneratedSections({ sections: data.sections, count: data.sections.length })
      setErrors({})
      setGenerated(true)
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePdfGenerate() {
    if (!pdfFile) return
    setPdfProcessing(true)
    setPdfError(null)
    try {
      const fd = new FormData()
      fd.append('file', pdfFile)
      const res = await fetch('/api/materials/process-pdf', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({})) as ProcessPdfResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'PDF processing failed')

      const sections = data.sections.map((s) => ({
        title: s.title,
        content: s.content,
        sourceType: 'pdf' as const,
        pdfStoragePath: s.pdfStoragePath,
      }))
      setGeneratedSections({ sections, count: sections.length })
      setGenerated(true)
      if (!form.title) {
        const pdfTitle = pdfFile.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim()
        setForm((f) => ({ ...f, title: pdfTitle }))
      }
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Failed to process PDF')
    } finally {
      setPdfProcessing(false)
    }
  }

  function updateCriterion(index: number, field: keyof RubricCriterionInput, value: string | number) {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }))
  }

  function addCriterion() {
    if (form.rubric.length >= 6) return
    setForm((prev) => ({ ...prev, rubric: [...prev.rubric, { label: '', description: '', maxPoints: 5 }] }))
  }

  function removeCriterion(index: number) {
    if (form.rubric.length <= 1) return
    setForm((prev) => ({ ...prev, rubric: prev.rubric.filter((_, i) => i !== index) }))
  }

  function clientValidate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = 'Required'
    else if (form.title.length > 200) next.title = 'Max 200 characters'
    if (!generatedSections) next.sections = 'Click "Generate" first to create sections from your material'
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
        sections: generatedSections!.sections.map((s) => ({
          title: s.title,
          content: s.content,
          ...(s.sourceType === 'pdf' ? { sourceType: 'pdf' as const, pdfStoragePath: s.pdfStoragePath } : {}),
        })),
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
      const data = await res.json().catch(() => ({})) as CreateAssignmentResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')

      if (isDevMode) {
        setCreatedAssignmentId(data.assignmentId)
      } else {
        returnToCanvas(data.jwt, data.returnUrl)
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
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
            <a href={`/assess/${createdAssignmentId}`} className="block w-full rounded-lg bg-[#2563A6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors">
              Preview as Student
            </a>
            <a href={`/dashboard/${createdAssignmentId}`} className="block w-full rounded-lg border border-[#E3E0D8] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors">
              View Submissions
            </a>
            <Link href="/dashboard" className="block w-full rounded-lg border border-[#E3E0D8] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors">
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
          <button onClick={backToTypePicker} className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#18202A] transition-colors">
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
                <BoltIcon className="w-4 h-4 text-[#7DB7D9] shrink-0" />
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-white">Generate with AI</h2>
              </div>
            </div>

            <div className="p-6">
              {/* PRIMARY PATH — PDF upload. Students see the PDF in their reading view. */}
              <div className="mb-5 rounded-lg border-2 border-[#2563A6] bg-[#EAF2FA] p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-[#2563A6] flex items-center justify-center shrink-0">
                    <PdfIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#18202A]">Upload a PDF</p>
                    <p className="text-xs text-[#6B7280] leading-relaxed">
                      AI splits the PDF into gated sections. Students read the original document, page by page.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className={[
                      'flex items-center gap-2 rounded-md border px-3 py-2 bg-white transition-colors',
                      pdfFile ? 'border-[#2563A6] text-[#18202A]' : 'border-[#BFD7EA] text-[#6B7280] hover:border-[#2563A6]',
                    ].join(' ')}>
                      <PdfIcon className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{pdfFile ? pdfFile.name : 'Choose PDF file…'}</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => { setPdfFile(e.target.files?.[0] ?? null); setPdfError(null) }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handlePdfGenerate}
                    disabled={!pdfFile || pdfProcessing}
                    className="flex items-center gap-1.5 shrink-0 rounded-md bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pdfProcessing ? <><Spinner />Analyzing…</> : 'Generate from PDF'}
                  </button>
                </div>
                {pdfProcessing && (
                  <p className="mt-2 text-xs text-[#6B7280]">Splitting PDF and uploading sections… this takes 10–20 seconds.</p>
                )}
                {pdfError && <p className="mt-2 text-xs text-[#C2413A]">{pdfError}</p>}
                {!pdfProcessing && generatedSections && generatedSections.sections.some((s) => s.sourceType === 'pdf') && (
                  <p className="mt-2 text-xs text-[#10B981] font-medium">
                    ✓ {generatedSections.count} sections created. Students will see the original PDF.
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E3E0D8]" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98]">or use text content</span>
                <div className="flex-1 h-px bg-[#E3E0D8]" />
              </div>

              {courseMaterials.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-[#6B7280]">Select reading material</p>
                  <div className="space-y-2">
                    {courseMaterials.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-3">
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
                          className="h-4 w-4 rounded border-[#D4CEC3] text-[#2563A6] focus:ring-[#2563A6]"
                        />
                        <span className="flex items-center gap-2 text-sm text-[#374151]">
                          {m.title}
                          {m.pdfStoragePath && (
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">PDF</span>
                          )}
                        </span>
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
                          onClick={() => setForm((prev) => ({ ...prev, assignmentMaterials: prev.assignmentMaterials.filter((_, j) => j !== i) }))}
                          className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none"
                          aria-label="Remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                {addingMaterial ? (
                  <InlineMaterialForm
                    hidePdfTab
                    onAdd={(m) => { setForm((prev) => ({ ...prev, assignmentMaterials: [...prev.assignmentMaterials, m] })); setAddingMaterial(false) }}
                    onCancel={() => setAddingMaterial(false)}
                  />
                ) : (
                  <button type="button" onClick={() => setAddingMaterial(true)} className="flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors">
                    <span className="text-base leading-none">+</span>
                    Add text or link
                  </button>
                )}
              </div>

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
              {errors.sections && <p className="mb-3 text-sm text-[#C2413A]">{errors.sections}</p>}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex items-center gap-2 rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <><Spinner />Generating…</>
                ) : generated ? (
                  <><RegenerateIcon />Regenerate</>
                ) : (
                  <><BoltIcon className="w-3.5 h-3.5" />Generate</>
                )}
              </button>
            </div>
          </div>

          {/* Two even columns */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start mb-6">

            {/* Left — Sections */}
            <Section
              title="Sections"
              action={generatedSections ? (
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                  {generatedSections.count} total
                </span>
              ) : undefined}
            >
              {generatedSections ? (
                <div className="space-y-1.5">
                  {generatedSections.sections.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md border border-[#E3E0D8] bg-[#FAF9F6] px-3 py-2.5">
                      <span className="font-mono text-[10px] font-medium text-[#AEB8C2] shrink-0 w-4 text-right">{i + 1}</span>
                      <span className="text-sm text-[#374151]">{s.title}</span>
                      {s.sourceType === 'pdf' && (
                        <span className="ml-auto shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">PDF</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#D4CEC3] px-4 py-10 text-center">
                  <p className="text-xs text-[#8A8F98]">Select material above and click Generate — AI will divide it into sections automatically.</p>
                </div>
              )}
              {errors.sections && <p className="mt-2 text-xs text-[#C2413A]">{errors.sections}</p>}
            </Section>

            {/* Right — Title + Checkpoint */}
            <div className="space-y-6">
              <Section title="Assignment Title">
                <Field label="Title" error={errors.title} required>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. The Great Gatsby — Chapter 1–3 Reading"
                    maxLength={200}
                    className={inputCls(errors.title)}
                  />
                </Field>
              </Section>

              <Section title="Checkpoint Settings">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-[#6B7280]">Checkpoint mode</p>
                    <div className="flex gap-2">
                      {(['voice', 'text'] as const).map((mode) => (
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
                          {mode === 'voice' ? 'Voice' : 'Text'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[#8A8F98]">
                      {form.checkpointType === 'voice'
                        ? 'Students have a live voice conversation with AI after each section. The AI controls pacing.'
                        : 'Students type their response. AI evaluates and asks adaptive follow-up questions until satisfied.'}
                    </p>
                  </div>

                  {form.checkpointType === 'text' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Max follow-up questions</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={1} max={5} value={form.maxFollowUps} onChange={(e) => setForm((f) => ({ ...f, maxFollowUps: +e.target.value }))} className="w-32" />
                        <span className="font-mono text-sm font-semibold text-[#18202A] w-4">{form.maxFollowUps}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#8A8F98]">
                        If the student doesn&apos;t pass after {form.maxFollowUps} follow-up{form.maxFollowUps !== 1 ? 's' : ''}, the section is force-unlocked and poor engagement is reflected in the grade.
                      </p>
                    </div>
                  )}

                  <Toggle label="AI grading" checked={form.aiGradingEnabled} onChange={(v) => setForm((f) => ({ ...f, aiGradingEnabled: v }))} />
                </div>
              </Section>
            </div>
          </div>

          {/* Rubric — full width */}
          <Section
            title="Rubric"
            action={
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                Total <strong className="text-[#18202A]">{totalPoints} pts</strong>
              </span>
            }
          >
            <p className="mb-4 text-xs text-[#8A8F98]">Graded holistically across all checkpoint conversations at final submission.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {form.rubric.map((criterion, index) => (
                <div key={index} className="rounded-lg border border-[#E3E0D8] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[#8A8F98]">Criterion {index + 1}</span>
                    {form.rubric.length > 1 && (
                      <button type="button" onClick={() => removeCriterion(index)} className="text-[#8A8F98] hover:text-[#C2413A] transition-colors text-lg leading-none">×</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Label</label>
                      <input type="text" value={criterion.label} onChange={(e) => updateCriterion(index, 'label', e.target.value)} placeholder="e.g. Critical Engagement" maxLength={100} className={inputCls(errors[`rubric_${index}_label`])} />
                      {errors[`rubric_${index}_label`] && <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_label`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Description</label>
                      <input type="text" value={criterion.description} onChange={(e) => updateCriterion(index, 'description', e.target.value)} placeholder="What does good look like?" maxLength={500} className={inputCls(errors[`rubric_${index}_description`])} />
                      {errors[`rubric_${index}_description`] && <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_description`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6B7280]">Max points</label>
                      <input type="number" value={criterion.maxPoints} onChange={(e) => updateCriterion(index, 'maxPoints', Math.min(100, Math.max(1, +e.target.value)))} min={1} max={100} className={inputCls(errors[`rubric_${index}_points`])} />
                      {errors[`rubric_${index}_points`] && <p className="mt-0.5 text-xs text-[#C2413A]">{errors[`rubric_${index}_points`]}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {form.rubric.length < 6 && (
              <button type="button" onClick={addCriterion} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#2563A6] hover:text-[#1E518B] transition-colors">
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
              {submitting ? <><Spinner />Creating assignment…</> : <>Create Assignment <span>→</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
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

function inputCls(error?: string) {
  return [
    'w-full rounded-md border px-3 py-2 text-sm text-[#18202A] outline-none transition-colors',
    'placeholder:text-[#8A8F98]',
    'focus:ring-2 focus:ring-[#2563A6] focus:border-transparent',
    error ? 'border-[#C2413A] bg-[#FBEDEA]' : 'border-[#E3E0D8] bg-white hover:border-[#D4CEC3]',
  ].join(' ')
}

function InlineMaterialForm({ onAdd, onCancel, hidePdfTab = false }: { onAdd: (m: { title: string; content: string }) => void; onCancel: () => void; hidePdfTab?: boolean }) {
  const [source, setSource] = useState<'text' | 'url' | 'pdf'>('text')
  const tabs = hidePdfTab ? (['text', 'url'] as const) : (['text', 'url', 'pdf'] as const)
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
      if (source === 'text') { onAdd({ title: title.trim(), content: content.trim() }); return }
      if (source === 'url') {
        const res = await fetch('/api/materials/extract-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to fetch URL'); return }
        onAdd({ title: data.title, content: data.content }); return
      }
      if (source === 'pdf' && file) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/materials/extract-pdf', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to extract PDF'); return }
        onAdd({ title: data.title, content: data.content })
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const canAdd = !loading && (source === 'text' ? title.trim().length > 0 && content.trim().length > 0 : source === 'url' ? url.trim().length > 0 : file !== null)

  return (
    <div className="mt-2 rounded-lg border border-[#E3E0D8] bg-[#FAF9F6] p-4">
      <div className="mb-3 flex gap-1 rounded-md bg-[#E3E0D8] p-0.5 w-fit">
        {tabs.map((s) => (
          <button key={s} type="button" onClick={() => { setSource(s); setError(null) }} className={['px-3 py-1 text-xs font-medium rounded transition-colors', source === s ? 'bg-[#2563A6] text-white' : 'text-[#6B7280] hover:text-[#374151]'].join(' ')}>
            {s === 'text' ? 'Text' : s === 'url' ? 'Link' : 'PDF'}
          </button>
        ))}
      </div>
      {source === 'text' && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5" maxLength={200} autoFocus className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]" />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the reading here…" rows={5} maxLength={50000} className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98] resize-none" />
          </div>
        </>
      )}
      {source === 'url' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus className="w-full rounded-md border border-[#E3E0D8] bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#2563A6] focus:border-transparent placeholder:text-[#8A8F98]" />
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
          {loading && <Spinner />}{loading ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-[#6B7280] border border-[#E3E0D8] rounded-md hover:bg-white transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function returnToCanvas(jwt: string, returnUrl: string) {
  const parsed = new URL(returnUrl)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error(`returnUrl has unexpected protocol: ${parsed.protocol}`)
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
