import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { findRegistrationById } from '@/lib/lti/registrations'
import { createAssignment } from '@/lib/assignments/repository'
import { replaceAssignmentMaterials } from '@/lib/materials/repository'
import { buildDeepLinkResponseJwt } from '@/lib/lti/deep-link'
import type { CreateOralAssessmentRequest, CreateAssignmentResponse } from '@/types/api'

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  let body: CreateOralAssessmentRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const validationError = validate(body)
  if (validationError) return err(validationError, 400)

  const registration = await findRegistrationById(session.registrationId)
  if (!registration) return err('Registration not found', 500)

  const pointsPossible = body.rubric.reduce((sum, c) => sum + c.maxPoints, 0)

  const assignmentId = await createAssignment({
    courseId: session.courseId,
    createdBy: session.userId,
    title: body.title,
    pointsPossible,
    prompt: body.prompt,
    preparationTimeSeconds: body.preparationTimeSeconds,
    maxResponseTimeSeconds: body.maxResponseTimeSeconds,
    followUpQuestionCount: body.followUpQuestionCount,
    cameraRequired: body.cameraRequired,
    aiGradingEnabled: body.aiGradingEnabled,
    rubric: body.rubric,
    selectedMaterialIds: body.selectedMaterialIds ?? [],
  })

  if (body.assignmentMaterials && body.assignmentMaterials.length > 0) {
    await replaceAssignmentMaterials(assignmentId, session.courseId, session.userId, body.assignmentMaterials)
  }

  const jwt = await buildDeepLinkResponseJwt(
    registration,
    { assignmentId, title: body.title, pointsPossible },
    body.dlData
  )

  const response: CreateAssignmentResponse = { assignmentId, jwt, returnUrl: body.returnUrl }
  return NextResponse.json(response, { status: 201 })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validate(body: CreateOralAssessmentRequest): string | null {
  if (!body.title || body.title.length < 1 || body.title.length > 200) {
    return 'title must be 1–200 characters'
  }
  if (!body.prompt || body.prompt.length < 10 || body.prompt.length > 2000) {
    return 'prompt must be 10–2000 characters'
  }
  if (body.preparationTimeSeconds < 0 || body.preparationTimeSeconds > 300) {
    return 'preparationTimeSeconds must be 0–300'
  }
  if (body.maxResponseTimeSeconds < 30 || body.maxResponseTimeSeconds > 600) {
    return 'maxResponseTimeSeconds must be 30–600'
  }
  if (body.followUpQuestionCount < 0 || body.followUpQuestionCount > 5) {
    return 'followUpQuestionCount must be 0–5'
  }
  if (!body.rubric || body.rubric.length < 1 || body.rubric.length > 6) {
    return 'rubric must have 1–6 criteria'
  }
  for (const criterion of body.rubric) {
    if (!criterion.label || criterion.label.length < 1 || criterion.label.length > 100) {
      return 'each rubric criterion label must be 1–100 characters'
    }
    if (!criterion.description || criterion.description.length < 1 || criterion.description.length > 500) {
      return 'each rubric criterion description must be 1–500 characters'
    }
    if (!Number.isFinite(criterion.maxPoints) || criterion.maxPoints < 1 || criterion.maxPoints > 100) {
      return 'each rubric criterion maxPoints must be 1–100'
    }
  }
  if (body.selectedMaterialIds !== undefined) {
    if (!Array.isArray(body.selectedMaterialIds)) return 'selectedMaterialIds must be an array'
    if (body.selectedMaterialIds.some((id) => !UUID_RE.test(id))) return 'selectedMaterialIds must be valid UUIDs'
  }
  if (body.assignmentMaterials !== undefined) {
    if (!Array.isArray(body.assignmentMaterials)) return 'assignmentMaterials must be an array'
    for (const m of body.assignmentMaterials) {
      if (!m.title || m.title.length < 1 || m.title.length > 200) return 'each material title must be 1–200 characters'
      if (!m.content || m.content.length < 1 || m.content.length > 50000) return 'each material content must be 1–50,000 characters'
    }
  }
  if (!body.returnUrl) {
    return 'returnUrl is required'
  }
  try {
    const parsed = new URL(body.returnUrl)
    const devMode = process.env.LTI_DEV_MODE === 'true'
    if (!devMode && parsed.protocol !== 'https:') return 'returnUrl must be an https URL'
  } catch {
    return 'returnUrl must be a valid URL'
  }
  return null
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
