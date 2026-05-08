import { NextResponse } from 'next/server'
import { getToolPublicJwk } from '@/lib/lti/jwks'

export async function GET() {
  try {
    const jwk = await getToolPublicJwk()
    return NextResponse.json({ keys: [jwk] })
  } catch (e) {
    console.error('[JWKS] Failed to serve public key:', e)
    return NextResponse.json(
      { error: 'Key unavailable' },
      { status: 500 }
    )
  }
}
