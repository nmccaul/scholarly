import { getOpenAIClient } from './client'
import { buildPassCriteriaPrompt } from './pass-criteria'
import type { AiGradeRationale, CheckpointAction, CheckpointConversationTurn, CheckpointPassMode, CheckpointStatus, ReadingSection, RubricCriterion } from '@/types/domain'

export async function evaluateCheckpointResponse(params: {
  sectionTitle: string
  sectionContent: string
  conversation: CheckpointConversationTurn[]
  checkpointPassMode: CheckpointPassMode
  checkpointActions: CheckpointAction[]
}): Promise<{
  passed: boolean
  feedbackMessage: string
  followUpQuestion: string | null
}> {
  const client = getOpenAIClient()

  const conversationText = params.conversation
    .map((t) => `${t.role === 'student' ? 'Student' : 'AI'}: ${t.text}`)
    .join('\n\n')

  const response = await client.chat.completions.create(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an academic reading evaluator. Decide whether the student has passed the checkpoint for the reading section below.

This section may be ANY kind of text — an argument-based essay, a poem, a news article, a primary source, a memoir, a textbook chapter introducing concepts. Do NOT require the student to identify or evaluate an "argument" unless the text actually makes one.

${buildPassCriteriaPrompt(params.checkpointPassMode, params.checkpointActions)}

When failing, generate a follow-up question that is dynamic and specific to exactly what the student said:
- If they mention something that caught their attention, ask why it stood out
- If they raise a question or confusion, explore it with them
- If they summarize without interpreting, ask what they actually think of it
- If they react vaguely, ask them to point to a specific moment in the text and explain
Make the question direct and answerable in 2–3 sentences.

Section title: ${params.sectionTitle}

Section content:
${params.sectionContent}

Return JSON only:
{ "passed": boolean, "feedbackMessage": string, "followUpQuestion": string | null }

feedbackMessage: 1–2 sentences. What was good about their response, and if failing, what is missing. Direct but not harsh.
followUpQuestion: A specific probing question when failing. null when passed.`,
        },
        {
          role: 'user',
          content: `Checkpoint conversation (student was invited to share anything about the section — a summary, what stood out, or any questions they have):\n\n${conversationText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    },
    { timeout: 30_000 }
  )

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No evaluation response from AI')

  const parsed = JSON.parse(content) as {
    passed: boolean
    feedbackMessage: string
    followUpQuestion: string | null
  }

  return {
    passed: Boolean(parsed.passed),
    feedbackMessage: parsed.feedbackMessage ?? '',
    followUpQuestion: parsed.followUpQuestion ?? null,
  }
}

export async function gradeReadingSubmission(params: {
  sections: ReadingSection[]
  checkpoints: Array<{
    sectionIndex: number
    conversation: CheckpointConversationTurn[]
    status: CheckpointStatus
  }>
  rubric: RubricCriterion[]
}): Promise<{ aiGrade: number; rationale: AiGradeRationale }> {
  const client = getOpenAIClient()

  const rubricText = params.rubric
    .map((c) => `- ${c.label} (0–${c.maxPoints} pts): ${c.description}`)
    .join('\n')

  const readingTranscript = params.checkpoints
    .map((cp) => {
      const section = params.sections[cp.sectionIndex]
      const sectionTitle = section?.title ?? `Section ${cp.sectionIndex + 1}`
      const status = cp.status === 'force_unlocked' ? ' [unlocked after max attempts]' : ' [passed]'
      const turns = cp.conversation
        .map((t) => `${t.role === 'student' ? 'Student' : 'AI'}: ${t.text}`)
        .join('\n')
      return `=== ${sectionTitle}${status} ===\n${turns}`
    })
    .join('\n\n')

  const response = await client.chat.completions.create(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an academic assessor grading a student's critical reading engagement.

The student completed a checkpoint reading assignment. After each section, they had a conversation demonstrating (or attempting to demonstrate) critical engagement. Sections marked [unlocked after max attempts] indicate the student did not pass the checkpoint naturally.

Rubric criteria:
${rubricText}

Grade each rubric criterion with a score from 0 to its max points based on the quality of critical thinking shown ACROSS ALL sections. Provide a brief rationale for each score.
Return JSON only: { "criteria_scores": [{ "label": string, "score": number, "rationale": string }], "overall_feedback": string }`,
        },
        {
          role: 'user',
          content: `Student's reading checkpoint conversations:\n\n${readingTranscript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    },
    { timeout: 30_000 }
  )

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No grading response from AI')

  const parsed = JSON.parse(content) as {
    criteria_scores: Array<{ label: string; score: number; rationale: string }>
    overall_feedback: string
  }

  const rationale: AiGradeRationale = {
    criteriaScores: parsed.criteria_scores.map((s, i) => {
      const maxPoints = params.rubric[i]?.maxPoints ?? 100
      return {
        label: s.label,
        score: Math.max(0, Math.min(Number(s.score), maxPoints)),
        rationale: s.rationale,
      }
    }),
    overallFeedback: parsed.overall_feedback,
  }

  return {
    aiGrade: rationale.criteriaScores.reduce((sum, s) => sum + s.score, 0),
    rationale,
  }
}
