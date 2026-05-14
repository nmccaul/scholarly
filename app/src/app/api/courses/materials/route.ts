import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { listCourseMaterials, createCourseMaterial } from '@/lib/materials/repository'
import { apiError } from '@/lib/api/response'
import type { CourseMaterialInput, CourseMaterialResponse } from '@/types/api'

export async function GET() {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return apiError('Internal server error', 500)
  }

  try {
    const materials = await listCourseMaterials(session.courseId)
    const response: CourseMaterialResponse[] = materials.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      pdfStoragePath: m.pdfStoragePath,
      createdAt: m.createdAt,
    }))
    return NextResponse.json(response)
  } catch (e) {
    console.error('Failed to list course materials:', e)
    return apiError('Internal server error', 500)
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

  let body: CourseMaterialInput
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.title || body.title.length < 1 || body.title.length > 200) {
    return apiError('title must be 1–200 characters', 400)
  }
  if (!body.content || body.content.length < 1 || body.content.length > 50000) {
    return apiError('content must be 1–50,000 characters', 400)
  }

  try {
    const id = await createCourseMaterial({
      courseId: session.courseId,
      createdBy: session.userId,
      title: body.title.trim(),
      content: body.content.trim(),
      pdfStoragePath: typeof body.pdfStoragePath === 'string' ? body.pdfStoragePath : undefined,
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    console.error('Failed to create course material:', e)
    return apiError('Internal server error', 500)
  }
}
