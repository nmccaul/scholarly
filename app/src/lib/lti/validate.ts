import * as jose from 'jose'
import { consumeNonce } from '@/lib/redis/client'
import { fetchPlatformPublicKeys } from './jwks'
import type { LtiRegistration } from '@/types/domain'

const KNOWN_MESSAGE_TYPES = ['LtiResourceLinkRequest', 'LtiDeepLinkingRequest']

export interface LtiLaunchClaims {
  iss: string
  sub: string | undefined
  aud: string | string[]
  exp: number
  iat: number
  nonce: string
  messageType: string
  version: string
  deploymentId: string
  targetLinkUri: string
  resourceLink: { id: string; title?: string; description?: string } | undefined
  roles: string[]
  // Standard OIDC user profile claims
  name: string | undefined
  givenName: string | undefined
  familyName: string | undefined
  email: string | undefined
  picture: string | undefined
  context: { id: string; title?: string; label?: string } | undefined
  custom: Record<string, string> | undefined
  agsEndpoint: { lineitems?: string; lineitem?: string; scope: string[] } | undefined
  nrpsEndpoint: { contextMembershipsUrl: string } | undefined
  deepLinkingSettings:
    | { deepLinkReturnUrl: string; acceptTypes: string[]; data?: string }
    | undefined
}

export type ValidationResult =
  | { ok: true; claims: LtiLaunchClaims }
  | { ok: false; error: string }

export async function validateLtiJwt(
  idToken: string,
  registration: LtiRegistration,
  receivedState: string
): Promise<ValidationResult> {
  let keys: CryptoKey[]
  try {
    keys = await fetchPlatformPublicKeys(registration.jwksUrl)
  } catch (e) {
    return { ok: false, error: `JWKS fetch failed: ${String(e)}` }
  }

  let payload: jose.JWTPayload | null = null
  for (const key of keys) {
    try {
      const result = await jose.jwtVerify(idToken, key, {
        issuer: registration.platformIss,
        audience: registration.clientId,
        clockTolerance: 60,
      })
      payload = result.payload
      break
    } catch {
      // try next key
    }
  }

  if (!payload) {
    return { ok: false, error: 'JWT signature verification failed against all platform keys' }
  }

  // iat sanity check — jose handles exp, this guards against future-dated tokens
  const now = Math.floor(Date.now() / 1000)
  if (!payload.iat || payload.iat > now + 300) {
    return { ok: false, error: 'JWT iat is too far in the future' }
  }

  // Validate deployment_id
  const deploymentId = payload[
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id'
  ] as string | undefined
  if (!deploymentId || deploymentId !== registration.deploymentId) {
    return { ok: false, error: 'deployment_id mismatch' }
  }

  // Consume nonce — also validates state (CSRF protection)
  const nonce = payload.nonce as string | undefined
  if (!nonce) {
    return { ok: false, error: 'nonce missing from JWT' }
  }
  const nonceRecord = await consumeNonce(nonce)
  if (!nonceRecord) {
    return { ok: false, error: 'nonce not found, expired, or already consumed' }
  }

  // Validate state matches what we stored when generating the nonce (CSRF check)
  if (nonceRecord.state !== receivedState) {
    return { ok: false, error: 'state mismatch — possible CSRF attempt' }
  }

  // Validate LTI version
  const version = payload[
    'https://purl.imsglobal.org/spec/lti/claim/version'
  ] as string | undefined
  if (version !== '1.3.0') {
    return { ok: false, error: `Unsupported LTI version: ${version}` }
  }

  // Validate message type is known
  const messageType = payload[
    'https://purl.imsglobal.org/spec/lti/claim/message_type'
  ] as string | undefined
  if (!messageType || !KNOWN_MESSAGE_TYPES.includes(messageType)) {
    return { ok: false, error: `Unknown message_type: ${messageType}` }
  }

  const targetLinkUri = payload[
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri'
  ] as string | undefined
  if (!targetLinkUri) {
    return { ok: false, error: 'target_link_uri claim missing' }
  }

  const resourceLink = payload[
    'https://purl.imsglobal.org/spec/lti/claim/resource_link'
  ] as { id: string; title?: string; description?: string } | undefined
  const roles = (payload[
    'https://purl.imsglobal.org/spec/lti/claim/roles'
  ] as string[] | undefined) ?? []
  const context = payload[
    'https://purl.imsglobal.org/spec/lti/claim/context'
  ] as { id: string; title?: string; label?: string } | undefined
  const custom = payload[
    'https://purl.imsglobal.org/spec/lti/claim/custom'
  ] as Record<string, string> | undefined
  const agsRaw = payload[
    'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'
  ] as { lineitems?: string; lineitem?: string; scope: string[] } | undefined
  const nrpsRaw = payload[
    'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'
  ] as { context_memberships_url?: string } | undefined
  const dlRaw = payload[
    'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'
  ] as { deep_link_return_url?: string; accept_types?: string[]; data?: string } | undefined

  const claims: LtiLaunchClaims = {
    iss: payload.iss!,
    sub: payload.sub,
    aud: payload.aud as string | string[],
    exp: payload.exp!,
    iat: payload.iat!,
    nonce,
    messageType,
    version,
    deploymentId,
    targetLinkUri,
    resourceLink,
    roles,
    // Standard OIDC user profile claims (present when privacy_level = public)
    name: payload.name as string | undefined,
    givenName: payload.given_name as string | undefined,
    familyName: payload.family_name as string | undefined,
    email: payload.email as string | undefined,
    picture: payload.picture as string | undefined,
    context,
    custom,
    agsEndpoint: agsRaw,
    nrpsEndpoint: nrpsRaw
      ? { contextMembershipsUrl: nrpsRaw.context_memberships_url! }
      : undefined,
    deepLinkingSettings: dlRaw
      ? {
          deepLinkReturnUrl: dlRaw.deep_link_return_url!,
          acceptTypes: dlRaw.accept_types ?? [],
          data: dlRaw.data,
        }
      : undefined,
  }

  return { ok: true, claims }
}

export function extractUserRole(roles: string[]): 'instructor' | 'learner' {
  const instructorRoles = [
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator',
    'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
  ]
  return roles.some((r) => instructorRoles.includes(r)) ? 'instructor' : 'learner'
}
