import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { apiError } from '@/lib/api/response'
import { PDFParse } from 'pdf-parse'

const MAX_PDF_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return apiError('Internal server error', 500)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('Invalid form data', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return apiError('No file provided', 400)

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return apiError('File must be a PDF', 400)
  }

  if (file.size > MAX_PDF_BYTES) {
    return apiError('PDF must be under 5 MB', 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let text: string
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text
  } catch (e) {
    console.error('pdf-parse failed:', e)
    return apiError('Could not read that PDF. It may be encrypted or corrupted.', 422)
  }

  const content = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .slice(0, 50000)

  if (content.length < 10) {
    return apiError('No readable text found. This PDF may contain only scanned images.', 422)
  }

  const title = file.name
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 200) || 'Uploaded PDF'

  return NextResponse.json({ title, content })
}

