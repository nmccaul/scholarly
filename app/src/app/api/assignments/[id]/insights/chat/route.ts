import { NextRequest } from 'next/server'
import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { findReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import { getAllCheckpointsForAssignment } from '@/lib/reading/repository'
import { buildInsightsSystemPrompt } from '@/lib/ai/insights-prompt'
import { getOpenAIClient } from '@/lib/ai/client'
import { apiError } from '@/lib/api/response'
import type { AssignmentId } from '@/types/domain'
import type { InsightsChatRequest } from '@/types/api'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) return apiError(e.message, 401)
    if (e instanceof ForbiddenError) return apiError(e.message, 403)
    throw e
  }

  const { id } = await params
  const assignment = await findReadingAssignmentWithConfig(id as AssignmentId)
  if (!assignment || assignment.courseId !== session.courseId) {
    return apiError('Assignment not found', 404)
  }

  let body: InsightsChatRequest
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return apiError('messages must be a non-empty array', 400)
  }
  if (body.messages.length > 20) {
    return apiError('Too many messages (max 20)', 400)
  }
  for (const msg of body.messages) {
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return apiError('Each message must have role "user" or "assistant"', 400)
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      return apiError('Each message must have non-empty content', 400)
    }
  }
  if (body.messages[body.messages.length - 1].role !== 'user') {
    return apiError('Last message must be from the user', 400)
  }

  const students = await getAllCheckpointsForAssignment(assignment.id)
  const systemPrompt = buildInsightsSystemPrompt(assignment, students)

  const client = getOpenAIClient()
  const openaiStream = await client.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...body.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) controller.enqueue(encoder.encode(delta))
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
