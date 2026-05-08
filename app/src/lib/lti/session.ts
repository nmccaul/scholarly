import { cookies } from 'next/headers'
import * as jose from 'jose'
import type { LtiSession, LtiSub } from '@/types/domain'
import { DEMO_USER_ID, DEMO_REGISTRATION_ID, DEMO_COURSE_ID } from '@/lib/demo/seed-ids'

const SESSION_COOKIE = 'scholarly_session'
const SESSION_DURATION_SECONDS = 7200 // 2 hours

// Dev mode mock session — only active when LTI_DEV_MODE=true
// IDs match the seed data in supabase/migrations/001_initial_schema.sql
const DEV_SESSION: LtiSession = {
  userId: DEMO_USER_ID,
  registrationId: DEMO_REGISTRATION_ID,
  courseId: DEMO_COURSE_ID,
  deploymentId: 'dev-deployment-id',
  role: 'instructor',
  ltiSub: 'dev-sub-001' as LtiSub,
  expiresAt: 0, // refreshed on every getSession() call
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

export async function createSession(session: LtiSession): Promise<string> {
  const secret = getSessionSecret()
  const token = await new jose.SignJWT(session as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(session.expiresAt)
    .setIssuedAt()
    .sign(secret)
  return token
}

export async function setSessionCookie(session: LtiSession, maxAgeSecs = SESSION_DURATION_SECONDS): Promise<void> {
  const token = await createSession(session)
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // sameSite=none requires Secure. In dev we use lax (no iframe cross-site needed locally).
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAgeSecs,
    path: '/',
  })
}

export async function getSession(): Promise<LtiSession | null> {
  if (process.env.LTI_DEV_MODE === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LTI_DEV_MODE must not be enabled in production')
    }
    return {
      ...DEV_SESSION,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const secret = getSessionSecret()
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as unknown as LtiSession
  } catch (e) {
    console.warn('[session] JWT verification failed:', e instanceof Error ? e.message : String(e))
    return null
  }
}

export async function requireSession(): Promise<LtiSession> {
  const session = await getSession()
  if (!session) {
    throw new SessionError('No valid session — LTI launch required')
  }
  return session
}

export async function requireInstructor(): Promise<LtiSession> {
  const session = await requireSession()
  if (session.role !== 'instructor') {
    throw new ForbiddenError('Instructor role required')
  }
  return session
}

export class SessionError extends Error {
  readonly statusCode = 401
  constructor(message: string) {
    super(message)
    this.name = 'SessionError'
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}
