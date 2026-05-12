import { Redis } from '@upstash/redis'

// Lazily initialized — safe in edge runtime
let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error('Upstash Redis env vars not configured')
  }

  _redis = new Redis({ url, token })
  return _redis
}

export const NONCE_TTL_SECONDS = 600 // 10 minutes

// No `consumed` flag — deletion is the consumption, making replay attacks impossible.
export interface NonceRecord {
  state: string
  registrationId: string
}

export async function storeNonce(
  nonce: string,
  state: string,
  registrationId: string
): Promise<void> {
  const record: NonceRecord = { state, registrationId }
  await getRedis().set(`nonce:${nonce}`, JSON.stringify(record), {
    ex: NONCE_TTL_SECONDS,
  })
}

// Best-effort rate limit. incr+expire are not atomic, but a crash between them
// only risks a key with no TTL — acceptable for this use case.
export async function checkRateLimit(key: string, maxRequests: number, windowSecs: number): Promise<boolean> {
  const redis = getRedis()
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSecs)
  return count <= maxRequests
}

// Atomic GETDEL: returns the record and deletes it in one operation.
// A second call with the same nonce returns null — replay is impossible.
export async function consumeNonce(nonce: string): Promise<NonceRecord | null> {
  const raw = await getRedis().getdel(`nonce:${nonce}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as NonceRecord)
}

