import { createServiceClient } from '@/lib/supabase/client'
import type { RegistrationId, AssignmentId, SubmissionId } from '@/types/domain'

const BUCKET = 'recordings'

export function responseRecordingPath(
  registrationId: RegistrationId,
  assignmentId: AssignmentId,
  submissionId: SubmissionId
): string {
  return `${registrationId}/${assignmentId}/${submissionId}/response.webm`
}

export function followUpRecordingPath(
  registrationId: RegistrationId,
  assignmentId: AssignmentId,
  submissionId: SubmissionId,
  index: number
): string {
  return `${registrationId}/${assignmentId}/${submissionId}/follow-up-${index}.webm`
}

export async function createSignedUploadUrl(path: string): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error || !data) throw new Error(`Failed to create upload URL: ${error?.message}`)
  return data.signedUrl
}

export async function createSignedDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
  const db = createServiceClient()
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error(`Failed to create download URL: ${error?.message}`)
  return data.signedUrl
}

export async function downloadRecording(path: string): Promise<Blob> {
  const db = createServiceClient()
  const { data, error } = await db.storage.from(BUCKET).download(path)
  if (error || !data) throw new Error(`Failed to download recording: ${error?.message}`)
  return data
}
