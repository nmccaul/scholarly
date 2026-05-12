const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface AssignmentBody {
  title?: unknown
  prompt?: unknown
  preparationTimeSeconds?: unknown
  maxResponseTimeSeconds?: unknown
  followUpQuestionCount?: unknown
  rubric?: unknown
  selectedMaterialIds?: unknown
  assignmentMaterials?: unknown
  returnUrl?: unknown
}

export function validateOralAssessmentBody(
  body: AssignmentBody,
  opts: { requireReturnUrl: boolean } = { requireReturnUrl: false }
): string | null {
  if (!body.title || typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
    return 'title must be 1–200 characters'
  }
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length < 10 || body.prompt.length > 2000) {
    return 'prompt must be 10–2000 characters'
  }
  const prep = Number(body.preparationTimeSeconds)
  if (!Number.isFinite(prep) || prep < 0 || prep > 300) {
    return 'preparationTimeSeconds must be 0–300'
  }
  const maxResponse = Number(body.maxResponseTimeSeconds)
  if (!Number.isFinite(maxResponse) || maxResponse < 30 || maxResponse > 600) {
    return 'maxResponseTimeSeconds must be 30–600'
  }
  const followUp = Number(body.followUpQuestionCount)
  if (!Number.isFinite(followUp) || followUp < 0 || followUp > 5) {
    return 'followUpQuestionCount must be 0–5'
  }
  if (!Array.isArray(body.rubric) || body.rubric.length < 1 || body.rubric.length > 6) {
    return 'rubric must have 1–6 criteria'
  }
  for (const criterion of body.rubric) {
    const c = criterion as Record<string, unknown>
    if (!c.label || typeof c.label !== 'string' || c.label.length < 1 || c.label.length > 100) {
      return 'each rubric criterion label must be 1–100 characters'
    }
    if (!c.description || typeof c.description !== 'string' || c.description.length < 1 || c.description.length > 500) {
      return 'each rubric criterion description must be 1–500 characters'
    }
    const pts = Number(c.maxPoints)
    if (!Number.isFinite(pts) || pts < 1 || pts > 100) {
      return 'each rubric criterion maxPoints must be 1–100'
    }
  }
  if (body.selectedMaterialIds !== undefined) {
    if (!Array.isArray(body.selectedMaterialIds)) return 'selectedMaterialIds must be an array'
    if ((body.selectedMaterialIds as unknown[]).some((id) => !UUID_RE.test(String(id)))) {
      return 'selectedMaterialIds must be valid UUIDs'
    }
  }
  if (body.assignmentMaterials !== undefined) {
    if (!Array.isArray(body.assignmentMaterials)) return 'assignmentMaterials must be an array'
    for (const m of body.assignmentMaterials as Record<string, unknown>[]) {
      if (!m.title || typeof m.title !== 'string' || m.title.length < 1 || m.title.length > 200) {
        return 'each material title must be 1–200 characters'
      }
      if (!m.content || typeof m.content !== 'string' || m.content.length < 1 || m.content.length > 50000) {
        return 'each material content must be 1–50,000 characters'
      }
    }
  }
  if (opts.requireReturnUrl) {
    if (!body.returnUrl || typeof body.returnUrl !== 'string') return 'returnUrl is required'
    try {
      const parsed = new URL(body.returnUrl)
      if (parsed.protocol !== 'https:') return 'returnUrl must be an https URL'
    } catch {
      return 'returnUrl must be a valid URL'
    }
  }
  return null
}
