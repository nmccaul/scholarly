import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { findRegistrationById } from '@/lib/lti/registrations'
import { createReadingAssignment } from '@/lib/assignments/repository'
import { buildDeepLinkResponseJwt } from '@/lib/lti/deep-link'
import { validateReadingAssessmentBody } from '@/lib/assignments/validation'
import { apiError } from '@/lib/api/response'
import { DEMO_DEPLOYMENT_ID } from '@/lib/demo/seed-ids'
import type { CreateReadingAssessmentRequest, CreateAssignmentResponse } from '@/types/api'

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return apiError('Internal server error', 500)
  }

  let body: CreateReadingAssessmentRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const isDemo = session.deploymentId === DEMO_DEPLOYMENT_ID
  const devMode = process.env.LTI_DEV_MODE === 'true'
  const validationError = validateReadingAssessmentBody(body, {
    requireReturnUrl: !isDemo && !devMode,
  })
  if (validationError) return apiError(validationError, 400)

  const registration = await findRegistrationById(session.registrationId)
  if (!registration) return apiError('Session expired or invalid', 401)

  const pointsPossible = body.rubric.reduce((sum, c) => sum + c.maxPoints, 0)

  const assignmentId = await createReadingAssignment({
    courseId: session.courseId,
    createdBy: session.userId,
    title: body.title,
    pointsPossible,
    sections: body.sections,
    checkpointType: body.checkpointType,
    maxFollowUps: body.maxFollowUps,
    aiGradingEnabled: body.aiGradingEnabled,
    rubric: body.rubric,
    checkpointPassMode: body.checkpointPassMode,
    checkpointActions: body.checkpointActions,
  })

  const jwt = isDemo
    ? ''
    : await buildDeepLinkResponseJwt(
        registration,
        { assignmentId, title: body.title, pointsPossible },
        body.dlData
      )

  const response: CreateAssignmentResponse = { assignmentId, jwt, returnUrl: body.returnUrl }
  return NextResponse.json(response, { status: 201 })
}
