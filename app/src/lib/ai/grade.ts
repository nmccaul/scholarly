import { getOpenAIClient } from './client'
import type { AiGradeRationale, RubricCriterion } from '@/types/domain'

export async function gradeSubmission(params: {
  assignmentPrompt: string
  rubric: RubricCriterion[]
  transcript: string
  followUpExchanges: Array<{ question: string; answerTranscript: string }>
  contextMaterials?: Array<{ title: string; content: string }>
}): Promise<{ aiGrade: number; rationale: AiGradeRationale }> {
  const client = getOpenAIClient()

  const rubricText = params.rubric
    .map((c) => `- ${c.label} (0–${c.maxPoints} pts): ${c.description}`)
    .join('\n')

  const materialsText =
    params.contextMaterials && params.contextMaterials.length > 0
      ? '\n\nContext materials provided by the instructor:\n' +
        params.contextMaterials
          .map((m) => `[${m.title}]\n${m.content}`)
          .join('\n\n---\n\n')
      : ''

  let fullTranscript = `Initial response:\n${params.transcript}`
  if (params.followUpExchanges.length > 0) {
    const exchanges = params.followUpExchanges
      .map((e, i) => `Follow-up ${i + 1}: ${e.question}\nStudent: ${e.answerTranscript}`)
      .join('\n\n')
    fullTranscript += `\n\nFollow-up exchanges:\n${exchanges}`
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an academic assessor grading a student's oral assessment.

Assignment prompt: ${params.assignmentPrompt}${materialsText}

Rubric criteria:
${rubricText}

Grade each rubric criterion with a score from 0 to its max points, and provide a brief rationale for each score.
Return JSON only: { "criteria_scores": [{ "label": string, "score": number, "rationale": string }], "overall_feedback": string }`,
      },
      { role: 'user', content: `Student's full transcript:\n${fullTranscript}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No grading response from AI')

  const parsed = JSON.parse(content) as {
    criteria_scores: Array<{ label: string; score: number; rationale: string }>
    overall_feedback: string
  }

  const rationale: AiGradeRationale = {
    criteriaScores: parsed.criteria_scores.map((s) => ({
      label: s.label,
      score: Number(s.score),
      rationale: s.rationale,
    })),
    overallFeedback: parsed.overall_feedback,
  }

  return {
    aiGrade: rationale.criteriaScores.reduce((sum, s) => sum + s.score, 0),
    rationale,
  }
}
