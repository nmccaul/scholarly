import { createServiceClient } from '@/lib/supabase/client'
import type { LtiRegistration, RegistrationId } from '@/types/domain'
import type { DbLtiRegistration } from '@/types/database'

function toRegistration(row: DbLtiRegistration): LtiRegistration {
  return {
    id: row.id as RegistrationId,
    clientId: row.client_id,
    deploymentId: row.deployment_id,
    platformIss: row.platform_iss,
    platformName: row.platform_name,
    oidcAuthUrl: row.oidc_auth_url,
    jwksUrl: row.jwks_url,
    tokenUrl: row.token_url,
  }
}

export async function findRegistrationById(
  id: RegistrationId
): Promise<LtiRegistration | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('lti_registrations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return toRegistration(data as DbLtiRegistration)
}

export async function findRegistrationByIssAndClientId(
  iss: string,
  clientId: string
): Promise<LtiRegistration | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('lti_registrations')
    .select('*')
    .eq('platform_iss', iss)
    .eq('client_id', clientId)
    .single()

  if (error || !data) return null
  return toRegistration(data as DbLtiRegistration)
}

export async function upsertUser(params: {
  registrationId: RegistrationId
  ltiSub: string
  email?: string
  name?: string
  givenName?: string
  familyName?: string
  pictureUrl?: string
}): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('users')
    .upsert(
      {
        registration_id: params.registrationId,
        lti_sub: params.ltiSub,
        email: params.email ?? null,
        name: params.name ?? null,
        given_name: params.givenName ?? null,
        family_name: params.familyName ?? null,
        picture_url: params.pictureUrl ?? null,
      },
      { onConflict: 'registration_id,lti_sub' }
    )
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to upsert user: ${error?.message}`)
  }
  return (data as { id: string }).id
}

export async function upsertCourse(params: {
  registrationId: RegistrationId
  ltiContextId: string
  title?: string
  label?: string
  canvasCourseId?: string
}): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('courses')
    .upsert(
      {
        registration_id: params.registrationId,
        lti_context_id: params.ltiContextId,
        title: params.title ?? null,
        label: params.label ?? null,
        canvas_course_id: params.canvasCourseId ?? null,
      },
      { onConflict: 'registration_id,lti_context_id' }
    )
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to upsert course: ${error?.message}`)
  }
  return (data as { id: string }).id
}
