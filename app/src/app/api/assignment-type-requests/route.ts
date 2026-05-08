import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { createServiceClient } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  let body: { assignmentType: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  if (!body.assignmentType || typeof body.assignmentType !== 'string') {
    return err('assignmentType is required', 400)
  }

  const db = createServiceClient()
  const { error } = await db.from('assignment_type_requests').insert({
    user_id: session.userId,
    assignment_type: body.assignmentType,
  })

  if (error) throw new Error(`Failed to save request: ${error.message}`)

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return err(e.message, 401)
    if (e instanceof ForbiddenError) return err(e.message, 403)
    throw e
  }

  let body: { assignmentType: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  if (!body.assignmentType || typeof body.assignmentType !== 'string') {
    return err('assignmentType is required', 400)
  }

  const db = createServiceClient()
  const { error } = await db
    .from('assignment_type_requests')
    .delete()
    .eq('user_id', session.userId)
    .eq('assignment_type', body.assignmentType)

  if (error) throw new Error(`Failed to delete request: ${error.message}`)

  return NextResponse.json({ ok: true })
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
