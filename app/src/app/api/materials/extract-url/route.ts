import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'

const MAX_HTML_BYTES = 2 * 1024 * 1024

function isSsrfTarget(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr)
    if (protocol !== 'http:' && protocol !== 'https:') return true
    const h = hostname.toLowerCase()
    // Strip IPv6 brackets for matching
    const bare = h.startsWith('[') ? h.slice(1, -1) : h
    if (bare === 'localhost' || bare === '0.0.0.0') return true
    if (/^127\./.test(bare)) return true          // loopback
    if (/^10\./.test(bare)) return true            // RFC 1918
    if (/^192\.168\./.test(bare)) return true      // RFC 1918
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(bare)) return true  // RFC 1918
    if (/^169\.254\./.test(bare)) return true      // link-local / AWS IMDS
    if (/^100\.6[4-9]\.|^100\.[7-9]\d\.|^100\.1[01]\d\.|^100\.12[0-7]\./.test(bare)) return true // CGNAT
    if (bare === '::1') return true                // IPv6 loopback
    if (/^fe80:/i.test(bare)) return true          // IPv6 link-local
    if (/^::ffff:/i.test(bare)) return true        // IPv4-mapped IPv6
    return false
  } catch {
    return true
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
}

function extractFromHtml(html: string, fallbackTitle: string): { title: string; content: string } {
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const title = rawTitle
    ? decodeEntities(rawTitle).replace(/\s+/g, ' ').trim().slice(0, 200)
    : fallbackTitle

  const content = decodeEntities(
    html
      .replace(/<head[\s\S]*?<\/head>/i, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?(p|div|h[1-6]|li|br|tr|td|th)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .slice(0, 50000)

  return { title, content }
}

export async function POST(req: NextRequest) {
  try {
    await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const urlStr = (body.url ?? '').trim()
  if (!urlStr) return err('url is required', 400)

  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return err('Invalid URL', 400)
  }

  if (isSsrfTarget(urlStr)) return err('URL not allowed', 400)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  let res: Response
  try {
    res = await fetch(urlStr, {
      headers: { 'User-Agent': 'Scholarly/1.0' },
      redirect: 'manual', // never follow redirects — a redirect to an internal address bypasses isSsrfTarget
      signal: controller.signal,
    })
  } catch {
    return err('Could not reach that URL. Check the address and try again.', 422)
  } finally {
    clearTimeout(timeout)
  }

  // Treat any redirect as an error — we don't follow them
  if (res.status >= 300 && res.status < 400) {
    return err('That URL redirects to another address, which is not supported. Try the final destination URL directly.', 422)
  }

  if (!res.ok) return err(`URL returned ${res.status}. Make sure the page is publicly accessible.`, 422)

  const rawContentType = res.headers.get('content-type') ?? ''
  const mime = rawContentType.split(';')[0].trim().toLowerCase()
  if (mime !== 'text/html' && mime !== 'text/plain') {
    return err('URL must point to a web page. To add a PDF, use the PDF option instead.', 422)
  }

  const html = (await res.text()).slice(0, MAX_HTML_BYTES)
  const { title, content } = extractFromHtml(html, parsed.hostname)

  if (content.length < 50) {
    return err('Not enough readable text found on that page.', 422)
  }

  return NextResponse.json({ title, content })
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
