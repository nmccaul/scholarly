import { createServiceClient } from '@/lib/supabase/client'
import type { CourseId } from '@/types/domain'

const BUCKET = 'materials'

export function sectionPdfPath(courseId: CourseId, uuid: string): string {
  return `sections/${courseId}/${uuid}.pdf`
}

export async function uploadPdf(path: string, buffer: Buffer): Promise<void> {
  const db = createServiceClient()
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (error) throw new Error(`Failed to upload PDF: ${error.message}`)
}

export async function createSignedPdfUrl(path: string, expiresIn = 14400): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error(`Failed to create signed PDF URL: ${error?.message}`)
  return data.signedUrl
}
