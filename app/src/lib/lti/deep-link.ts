import * as jose from 'jose'
import { v4 as uuid } from 'uuid'
import { getToolPrivateKey } from './jwks'
import type { LtiRegistration, AssignmentId } from '@/types/domain'

interface DeepLinkContentItem {
  assignmentId: AssignmentId
  title: string
  pointsPossible: number
}

export async function buildDeepLinkResponseJwt(
  registration: LtiRegistration,
  item: DeepLinkContentItem,
  dlData?: string
): Promise<string> {
  const privateKey = await getToolPrivateKey()
  const keyId = process.env.LTI_KEY_ID ?? 'scholarly-key-1'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  const now = Math.floor(Date.now() / 1000)

  const contentItem = {
    type: 'ltiResourceLink',
    title: item.title,
    url: `${appUrl}/api/lti/launch`,
    lineItem: {
      scoreMaximum: item.pointsPossible,
      label: item.title,
      resourceId: item.assignmentId,
      tag: 'oral-assessment',
    },
    custom: {
      scholarly_assignment_id: item.assignmentId,
    },
  }

  const claims: Record<string, unknown> = {
    iss: registration.clientId,
    aud: registration.platformIss,
    iat: now,
    exp: now + 600,
    nonce: uuid(),
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': registration.deploymentId,
    'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': [contentItem],
  }

  if (dlData) {
    claims['https://purl.imsglobal.org/spec/lti-dl/claim/data'] = dlData
  }

  return new jose.SignJWT(claims as jose.JWTPayload)
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .sign(privateKey)
}
