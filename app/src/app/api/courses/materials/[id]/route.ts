import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { deleteCourseMaterial } from '@/lib/materials/repository'
import type { CourseMaterialId } from '@/types/domain'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    console.error('Unexpected error in requireInstructor:', e)
    return err('Internal server error', 500)
  }

  const { id } = await params
  try {
    const deleted = await deleteCourseMaterial(id as CourseMaterialId, session.courseId)
    if (!deleted) return err('Material not found', 404)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Failed to delete course material:', e)
    return err('Internal server error', 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
