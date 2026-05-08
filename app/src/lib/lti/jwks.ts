import * as jose from 'jose'

// Cache JWKS per URL to avoid refetching on every launch
const jwksCache = new Map<string, { keys: CryptoKey[]; fetchedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function fetchPlatformPublicKeys(jwksUrl: string): Promise<CryptoKey[]> {
  const cached = jwksCache.get(jwksUrl)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.keys
  }

  const response = await fetch(jwksUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}: ${response.status}`)
  }

  const jwks = (await response.json()) as { keys: jose.JWK[] }
  const keys = await Promise.all(
    jwks.keys.map((jwk) => jose.importJWK(jwk, 'RS256') as Promise<CryptoKey>)
  )

  jwksCache.set(jwksUrl, { keys, fetchedAt: Date.now() })
  return keys
}

export async function getToolPublicJwk(): Promise<jose.JWK> {
  const privateKeyPem = process.env.LTI_PRIVATE_KEY_PEM
  const keyId = process.env.LTI_KEY_ID ?? 'scholarly-key-1'

  if (!privateKeyPem) {
    throw new Error('LTI_PRIVATE_KEY_PEM is not configured')
  }

  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256')
  const spki = await jose.exportSPKI(privateKey)
  const pubKey = await jose.importSPKI(spki, 'RS256')
  const jwk = await jose.exportJWK(pubKey)

  return { ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }
}

export async function getToolPrivateKey(): Promise<CryptoKey> {
  const privateKeyPem = process.env.LTI_PRIVATE_KEY_PEM
  if (!privateKeyPem) {
    throw new Error('LTI_PRIVATE_KEY_PEM is not configured')
  }
  return jose.importPKCS8(privateKeyPem, 'RS256') as Promise<CryptoKey>
}
