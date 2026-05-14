import { createServiceClient } from '@/lib/supabase/client'
import type { AssignmentId, CourseMaterialId, CourseId, UserId } from '@/types/domain'

export interface CourseMaterialRecord {
  id: CourseMaterialId
  title: string
  content: string
  pdfStoragePath?: string
  createdAt: string
}

export async function listCourseMaterials(courseId: CourseId): Promise<CourseMaterialRecord[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('course_materials')
    .select('id, title, content, pdf_storage_path, created_at')
    .eq('course_id', courseId)
    .is('assignment_id', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to list course materials: ${error.message}`)
  return (data ?? []).map(toRecord)
}

export async function createCourseMaterial(params: {
  courseId: CourseId
  createdBy: UserId
  title: string
  content: string
  pdfStoragePath?: string
  assignmentId?: AssignmentId
}): Promise<CourseMaterialId> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('course_materials')
    .insert({
      course_id: params.courseId,
      created_by: params.createdBy,
      title: params.title,
      content: params.content,
      ...(params.pdfStoragePath ? { pdf_storage_path: params.pdfStoragePath } : {}),
      ...(params.assignmentId ? { assignment_id: params.assignmentId } : {}),
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create course material: ${error?.message}`)
  return (data as { id: string }).id as CourseMaterialId
}

export async function deleteCourseMaterial(id: CourseMaterialId, courseId: CourseId): Promise<boolean> {
  const db = createServiceClient()
  const { error, count } = await db
    .from('course_materials')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('course_id', courseId)
    .is('assignment_id', null)
  if (error) throw new Error(`Failed to delete course material: ${error.message}`)
  return (count ?? 0) > 0
}

export async function getMaterialsByIds(ids: CourseMaterialId[], courseId: CourseId): Promise<CourseMaterialRecord[]> {
  if (ids.length === 0) return []
  const db = createServiceClient()
  const { data, error } = await db
    .from('course_materials')
    .select('id, title, content, pdf_storage_path, created_at')
    .in('id', ids)
    .eq('course_id', courseId)
  if (error) throw new Error(`Failed to fetch materials by IDs: ${error.message}`)
  return (data ?? []).map(toRecord)
}

export async function listAssignmentMaterials(assignmentId: AssignmentId): Promise<CourseMaterialRecord[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('course_materials')
    .select('id, title, content, pdf_storage_path, created_at')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to list assignment materials: ${error.message}`)
  return (data ?? []).map(toRecord)
}

export async function replaceAssignmentMaterials(
  assignmentId: AssignmentId,
  courseId: CourseId,
  createdBy: UserId,
  materials: Array<{ title: string; content: string }>
): Promise<void> {
  const db = createServiceClient()
  const { error: deleteError } = await db
    .from('course_materials')
    .delete()
    .eq('assignment_id', assignmentId)
    .eq('course_id', courseId)
  if (deleteError) throw new Error(`Failed to delete assignment materials: ${deleteError.message}`)
  if (materials.length === 0) return
  const { error: insertError } = await db.from('course_materials').insert(
    materials.map((m) => ({
      course_id: courseId,
      assignment_id: assignmentId,
      created_by: createdBy,
      title: m.title,
      content: m.content,
    }))
  )
  if (insertError) throw new Error(`Failed to insert assignment materials: ${insertError.message}`)
}

function toRecord(r: unknown): CourseMaterialRecord {
  const row = r as { id: string; title: string; content: string; pdf_storage_path?: string | null; created_at: string }
  return {
    id: row.id as CourseMaterialId,
    title: row.title,
    content: row.content,
    pdfStoragePath: row.pdf_storage_path ?? undefined,
    createdAt: row.created_at,
  }
}
