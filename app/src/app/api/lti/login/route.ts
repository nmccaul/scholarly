import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { storeNonce } from '@/lib/redis/client'
import { findRegistrationByIssAndClientId } from '@/lib/lti/registrations'

// Step 1 of the OIDC flow — Canvas initiates here (POST with form data, or GET with query params)
export async function POST(req: NextRequest) {
  return handleLoginInitiation(req, await getParams(req))
}

export async function GET(req: NextRequest) {
  return handleLoginInitiation(req, getQueryParams(req))
}

function getQueryParams(req: NextRequest): Record<string, string | null> {
  const { searchParams } = req.nextUrl
  return {
    iss: searchParams.get('iss'),
    login_hint: searchParams.get('login_hint'),
    target_link_uri: searchParams.get('target_link_uri'),
    client_id: searchParams.get('client_id'),
    lti_deployment_id: searchParams.get('lti_deployment_id'),
    lti_message_hint: searchParams.get('lti_message_hint'),
  }
}

async function getParams(req: NextRequest): Promise<Record<string, string | null>> {
  const body = await req.formData()
  return {
    iss: body.get('iss') as string | null,
    login_hint: body.get('login_hint') as string | null,
    target_link_uri: body.get('target_link_uri') as string | null,
    client_id: body.get('client_id') as string | null,
    lti_deployment_id: body.get('lti_deployment_id') as string | null,
    lti_message_hint: body.get('lti_message_hint') as string | null,
  }
}

async function handleLoginInitiation(
  _req: NextRequest,
  params: Record<string, string | null>
): Promise<NextResponse | Response> {
  const { iss, login_hint: loginHint, target_link_uri: targetLinkUri, client_id: clientId, lti_message_hint: ltiMessageHint } = params

  if (!iss || !loginHint || !targetLinkUri) {
    return NextResponse.json(
      { error: 'Missing required parameters: iss, login_hint, target_link_uri' },
      { status: 400 }
    )
  }

  const resolvedClientId = clientId ?? ''
  const registration = await findRegistrationByIssAndClientId(iss, resolvedClientId)
  if (!registration) {
    return NextResponse.json(
      { error: `No registration found for iss=${iss} client_id=${resolvedClientId}` },
      { status: 400 }
    )
  }

  const state = uuid()
  const nonce = uuid()

  await storeNonce(nonce, state, registration.id)

  const authParams = new URLSearchParams({
    scope: 'openid',
    response_type: 'id_token',
    response_mode: 'form_post',
    prompt: 'none',
    client_id: registration.clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/lti/launch`,
    login_hint: loginHint,
    state,
    nonce,
  })

  // Only include lti_message_hint when Canvas provided one
  if (ltiMessageHint) {
    authParams.set('lti_message_hint', ltiMessageHint)
  }

  const redirectUrl = `${registration.oidcAuthUrl}?${authParams.toString()}`
  return NextResponse.redirect(redirectUrl, { status: 302 })
}
