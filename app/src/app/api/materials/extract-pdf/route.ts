import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { apiError } from '@/lib/api/response'
import { sectionPdfPath, uploadPdf } from '@/lib/storage/materials'

const MAX_PDF_BYTES = 5 * 1024 * 1024

function ensureDomMatrix() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrixStub {
      a=1; b=0; c=0; d=1; e=0; f=0
      m11=1; m12=0; m13=0; m14=0
      m21=0; m22=1; m23=0; m24=0
      m31=0; m32=0; m33=1; m34=0
      m41=0; m42=0; m43=0; m44=1
      is2D=true; isIdentity=true
      constructor(_init?: string | number[]) {}
    }
    (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixStub
  }
}

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
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

  ensureDomMatrix()
  const { PDFParse } = await import('pdf-parse')

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

  // Upload full PDF to storage (non-fatal)
  let storagePath: string | null = null
  try {
    const path = sectionPdfPath(session.courseId, crypto.randomUUID())
    await uploadPdf(path, buffer)
    storagePath = path
  } catch (e) {
    console.error('PDF storage upload failed (non-fatal):', e)
  }

  return NextResponse.json({ title, content, storagePath })
}
