import { getOpenAIClient } from './client'

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const client = getOpenAIClient()
  const mime = audioBlob.type || 'audio/webm'
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
  const file = new File([audioBlob], `recording.${ext}`, { type: mime })
  const response = await client.audio.transcriptions.create({ model: 'whisper-1', file })
  return response.text
}
