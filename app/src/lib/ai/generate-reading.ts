import { getOpenAIClient } from './client'
import type { RubricCriterionInput } from '@/types/api'

export async function generateReadingAssignmentDetails(params: {
  materials: { title: string; content: string }[]
  direction: string
}): Promise<{
  title: string
  sections: Array<{ title: string; content: string }>
  rubric: RubricCriterionInput[]
}> {
  const client = getOpenAIClient()

  const materialsText = params.materials
    .map((m) => `[${m.title}]\n${m.content}`)
    .join('\n\n---\n\n')

  const teacherDirection = params.direction.trim()
  const directionText = teacherDirection || 'No extra direction provided.'

  const response = await client.chat.completions.create(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert educator designing reading checkpoint assignments. Given course materials, divide them into 2–6 logical sections with meaningful conceptual breaks — not arbitrary length splits. Each section should contain a complete, coherent argument or idea that a student can engage with critically.

The teacher's direction is high priority. Follow it closely for scope, difficulty, focus area, and structure.

Return JSON only with this exact shape:
{
  "title": string,        // Short assignment title, max 80 chars
  "sections": [           // 2–6 sections
    {
      "title": string,    // Section heading, max 100 chars — should indicate the argument or theme
      "content": string   // Full section text, preserved from source material
    }
  ],
  "rubric": [             // 3–4 criteria, maxPoints summing to 20
    { "label": string, "description": string, "maxPoints": number }
  ]
}

Rubric guidelines — focus on critical reading skills:
- 3–4 criteria only
- maxPoints per criterion: 4–8, summing to exactly 20
- Criteria should measure: argument identification, evidence evaluation, connection-making, quality of personal position
- label: 1–3 words (e.g. "Argument Analysis", "Evidence Evaluation", "Critical Position")
- description: one sentence describing what earns full marks`,
        },
        {
          role: 'user',
          content: `Teacher direction:\n${directionText}\n\nCourse materials:\n\n${materialsText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    },
    { timeout: 60_000 }
  )

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')

  const parsed = JSON.parse(content) as {
    title?: unknown
    sections?: unknown
    rubric?: unknown
  }

  if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
    throw new Error('AI returned invalid title')
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length < 1) {
    throw new Error('AI returned invalid sections')
  }

  const sections = (parsed.sections as unknown[]).map((s, i) => {
    const section = s as Record<string, unknown>
    if (typeof section.title !== 'string' || !section.title.trim()) {
      throw new Error(`Section ${i + 1} missing title`)
    }
    if (typeof section.content !== 'string' || !section.content.trim()) {
      throw new Error(`Section ${i + 1} missing content`)
    }
    return {
      title: section.title.trim().slice(0, 100),
      content: section.content.trim(),
    }
  })

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
    return {
      label: criterion.label.trim(),
      description: criterion.description.trim(),
      maxPoints: pts,
    }
  })

  return {
    title: parsed.title.trim().slice(0, 200),
    sections,
    rubric,
  }
}
