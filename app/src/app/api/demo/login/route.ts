import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/lti/session'
import { createServiceClient } from '@/lib/supabase/client'
import { checkRateLimit } from '@/lib/redis/client'
import { DEMO_USER_ID, DEMO_REGISTRATION_ID, DEMO_COURSE_ID, DEMO_DEPLOYMENT_ID } from '@/lib/demo/seed-ids'
import { apiError } from '@/lib/api/response'
import type { LtiSession, LtiSub } from '@/types/domain'

const DEMO_TTL = 30 * 24 * 60 * 60 // 30 days
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 3600 // 1 hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface DemoLoginBody {
  name?: string
  email?: string
  institution?: string
  interests?: string
}

export async function POST(req: NextRequest) {
  // Kill switch — set DEMO_ENABLED=false to disable the endpoint without a redeploy
  if (process.env.DEMO_ENABLED === 'false') {
    return apiError('Demo access is not currently available', 404)
  }

  // Rate limit by IP: 5 submissions per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await checkRateLimit(`demo:ratelimit:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)
  if (!allowed) return apiError('Too many requests. Please try again later.', 429)

  let body: DemoLoginBody
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid request', 400)
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const institution = (body.institution ?? '').trim()
  const interests = (body.interests ?? '').trim() || null

  if (!name || name.length > 200) return apiError('Name is required', 400)
  if (!email || !EMAIL_RE.test(email) || email.length > 200) return apiError('Valid email is required', 400)
  if (!institution || institution.length > 200) return apiError('Institution is required', 400)

  const db = createServiceClient()
  const { error: insertError } = await db
    .from('demo_leads')
    .insert({ name, email, institution, interests })

  if (insertError) {
    // Non-fatal — still grant access so a DB hiccup doesn't block a demo
    console.error('[demo] Failed to save lead:', insertError.message)
  }

  const session: LtiSession = {
    userId: DEMO_USER_ID,
    registrationId: DEMO_REGISTRATION_ID,
    courseId: DEMO_COURSE_ID,
    deploymentId: DEMO_DEPLOYMENT_ID,
    role: 'instructor',
    ltiSub: 'demo-sub' as LtiSub,
    expiresAt: Math.floor(Date.now() / 1000) + DEMO_TTL,
  }

  await setSessionCookie(session, DEMO_TTL)

  return NextResponse.json({ ok: true })
}

