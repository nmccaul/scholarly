import { NextRequest, NextResponse } from 'next/server'
import { validateLtiJwt, extractUserRole } from '@/lib/lti/validate'
import {
  findRegistrationByIssAndClientId,
  upsertUser,
  upsertCourse,
} from '@/lib/lti/registrations'
import { updateAssignmentLtiFields } from '@/lib/assignments/repository'
import { setSessionCookie } from '@/lib/lti/session'
import type { LtiSession, UserId, CourseId, AssignmentId, LtiSub } from '@/types/domain'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

// Step 4 of the OIDC flow — Canvas POSTs the signed id_token here
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const idToken = body.get('id_token') as string | null
  const state = body.get('state') as string | null

  if (!idToken || !state) {
    return errorResponse('Missing id_token or state', 400)
  }

  // Pre-decode payload (unverified) to extract iss/aud for registration lookup
  let rawPayload: Record<string, unknown>
  try {
    const parts = idToken.split('.')
    rawPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch {
    return errorResponse('Malformed JWT', 400)
  }

  const iss = rawPayload.iss as string | undefined
  const aud = rawPayload.aud as string | string[] | undefined
  const clientId = Array.isArray(aud) ? aud[0] : aud

  if (!iss || !clientId) {
    return errorResponse('JWT missing iss or aud', 400)
  }

  const registration = await findRegistrationByIssAndClientId(iss, clientId)
  if (!registration) {
    return errorResponse(`No registration for iss=${iss} client_id=${clientId}`, 401)
  }

  // Full validation — passes state so CSRF check happens inside
  const result = await validateLtiJwt(idToken, registration, state)
  if (!result.ok) {
    console.error('[LTI Launch] JWT validation failed:', result.error)
    return errorResponse(`JWT validation failed: ${result.error}`, 401)
  }

  const { claims } = result

  // Upsert user with profile data from JWT
  const userId = await upsertUser({
    registrationId: registration.id,
    ltiSub: claims.sub ?? 'anonymous',
    email: claims.email,
    name: claims.name,
    givenName: claims.givenName,
    familyName: claims.familyName,
    pictureUrl: claims.picture,
  })

  if (!claims.context) {
    return errorResponse('Course context is required for this tool', 400)
  }

  const courseId = (await upsertCourse({
    registrationId: registration.id,
    ltiContextId: claims.context.id,
    title: claims.context.title,
    label: claims.context.label,
  })) as CourseId

  const role = extractUserRole(claims.roles)

  const session: LtiSession = {
    userId: userId as UserId,
    registrationId: registration.id,
    courseId,
    deploymentId: claims.deploymentId,
    role,
    ltiSub: (claims.sub ?? 'anonymous') as LtiSub,
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
  }

  await setSessionCookie(session)

  // Route based on message type
  if (claims.messageType === 'LtiDeepLinkingRequest') {
    const params = new URLSearchParams()
    if (claims.deepLinkingSettings) {
      params.set('return_url', claims.deepLinkingSettings.deepLinkReturnUrl)
      if (claims.deepLinkingSettings.data) {
        params.set('dl_data', claims.deepLinkingSettings.data)
      }
    }
    return iframeRedirect(`${APP_URL}/builder?${params.toString()}`)
  }

  // LtiResourceLinkRequest — find our assignment via the custom claim we set at Deep Link time
  const scholarlyAssignmentId = claims.custom?.scholarly_assignment_id
  if (!scholarlyAssignmentId) {
    // Fallback for resource links created outside Scholarly (shouldn't happen in practice)
    return iframeRedirect(`${APP_URL}/dashboard/${courseId}`)
  }

  // Persist Canvas's resource link ID and lineitem URL so grade passback can use them
  if (claims.resourceLink?.id) {
    await updateAssignmentLtiFields(
      scholarlyAssignmentId as AssignmentId,
      claims.resourceLink.id,
      claims.agsEndpoint?.lineitem ?? null
    )
  }

  const destination =
    role === 'instructor'
      ? `/dashboard/${scholarlyAssignmentId}`
      : `/assess/${scholarlyAssignmentId}`

  return iframeRedirect(`${APP_URL}${destination}`)
}

// Meta-refresh redirect for iframe compatibility — some browsers block 302 redirects in iframes
function iframeRedirect(url: string) {
  const attrUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const jsUrl = JSON.stringify(url)
  const html = `<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0;url=${attrUrl}"></head>
<body><script>window.location.replace(${jsUrl})</script></body>
</html>`
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function errorResponse(message: string, status: number) {
  console.error(`[LTI Launch] ${message}`)
  return NextResponse.json({ error: message }, { status })
}
