import * as jose from 'jose'
import { v4 as uuid } from 'uuid'
import { getToolPrivateKey } from './jwks'
import type { LtiRegistration } from '@/types/domain'

const AGS_SCORE_SCOPE = 'https://purl.imsglobal.org/spec/lti-ags/scope/score'

async function getAccessToken(registration: LtiRegistration): Promise<string> {
  const privateKey = await getToolPrivateKey()
  const keyId = process.env.LTI_KEY_ID ?? 'scholarly-key-1'
  const now = Math.floor(Date.now() / 1000)

  const assertion = await new jose.SignJWT({
    iss: registration.clientId,
    sub: registration.clientId,
    aud: registration.tokenUrl,
    iat: now,
    exp: now + 60,
    jti: uuid(),
  })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .sign(privateKey)

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
    scope: AGS_SCORE_SCOPE,
  })

  const res = await fetch(registration.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canvas token request failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export async function submitGradeToCanvas(params: {
  registration: LtiRegistration
  lineitemUrl: string
  ltiSub: string
  scoreGiven: number
  scoreMaximum: number
}): Promise<unknown> {
  const token = await getAccessToken(params.registration)
  const base = params.lineitemUrl.replace(/\/+$/, '')
  const scoresUrl = base.endsWith('/scores') ? base : `${base}/scores`

  const payload = {
    userId: params.ltiSub,
    scoreGiven: params.scoreGiven,
    scoreMaximum: params.scoreMaximum,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    timestamp: new Date().toISOString(),
  }

  const res = await fetch(scoresUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.ims.lis.v1.score+json',
    },
    body: JSON.stringify(payload),
  })

  const responseBody = await res.json().catch(() => res.text())

  if (!res.ok) {
    throw new Error(`Canvas AGS score submission failed: ${res.status}`)
  }

  return responseBody
}
