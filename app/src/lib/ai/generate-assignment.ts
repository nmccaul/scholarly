import { getOpenAIClient } from './client'
import type { RubricCriterionInput } from '@/types/api'

export async function generateAssignmentDetails(params: {
  materials: { title: string; content: string }[]
  direction: string
}): Promise<{ title: string; prompt: string; rubric: RubricCriterionInput[] }> {
  const client = getOpenAIClient()

  const materialsText = params.materials
    .map((m) => `[${m.title}]\n${m.content}`)
    .join('\n\n---\n\n')

  const teacherDirection = params.direction.trim()
  const directionText = teacherDirection || 'No extra direction provided.'

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert educator designing oral assessment assignments. Generate a complete assignment from the course materials and the teacher's direction.

The teacher's direction is high priority. Follow it closely when choosing the question, scope, difficulty, topic, and wording. If the teacher asks for a simple question, generate a simple question. If the direction conflicts with the general assignment style guidance, follow the teacher's direction while still returning valid JSON and a usable rubric.

Return JSON only with this exact shape:
{
  "title": string,      // Short assignment title, max 80 chars
  "prompt": string,     // The prompt students will respond to verbally. Should be clear, specific, and require genuine understanding. 80–400 chars.
  "rubric": [           // 3–4 criteria, maxPoints values that sum to 20
    { "label": string, "description": string, "maxPoints": number }
  ]
}

Rubric guidelines:
- 3–4 criteria only
- maxPoints per criterion: 4–8, summing to exactly 20
- label: 1–3 words (e.g. "Content Accuracy", "Communication", "Use of Evidence")
- description: one sentence describing what earns full marks`,
      },
      {
        role: 'user',
        content: `Teacher direction:\n${directionText}\n\nCourse materials:\n\n${materialsText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')

  const parsed = JSON.parse(content) as {
    title?: unknown
    prompt?: unknown
    rubric?: unknown
  }

  if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
    throw new Error('AI returned invalid title')
  }
  if (typeof parsed.prompt !== 'string' || !parsed.prompt.trim()) {
    throw new Error('AI returned invalid prompt')
  }
  if (!Array.isArray(parsed.rubric) || parsed.rubric.length < 1) {
    throw new Error('AI returned invalid rubric')
  }

  const rubric: RubricCriterionInput[] = (parsed.rubric as unknown[]).map((c, i) => {
    const criterion = c as Record<string, unknown>
    if (typeof criterion.label !== 'string' || !criterion.label.trim()) {
      throw new Error(`Rubric criterion ${i + 1} missing label`)
    }
    if (typeof criterion.description !== 'string' || !criterion.description.trim()) {
      throw new Error(`Rubric criterion ${i + 1} missing description`)
    }
    const pts = Number(criterion.maxPoints)
    if (!Number.isFinite(pts) || pts < 1) {
      throw new Error(`Rubric criterion ${i + 1} has invalid maxPoints`)
    }
    return { label: criterion.label.trim(), description: criterion.description.trim(), maxPoints: pts }
  })

  return {
    title: parsed.title.trim().slice(0, 200),
    prompt: parsed.prompt.trim().slice(0, 2000),
    rubric,
  }
}
