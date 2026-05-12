import { getOpenAIClient } from './client'

export async function generateFollowUpQuestion(
  assignmentPrompt: string,
  transcript: string,
  priorExchanges: Array<{ question: string; answerTranscript: string }>
): Promise<string> {
  const client = getOpenAIClient()

  let context = `Student's response transcript: ${transcript}`
  if (priorExchanges.length > 0) {
    const prior = priorExchanges
      .map((e, i) => `Follow-up ${i + 1}: ${e.question}\nStudent: ${e.answerTranscript}`)
      .join('\n\n')
    context += `\n\nPrior follow-up exchanges:\n${prior}`
  }

  const response = await client.chat.completions.create(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an academic assessor evaluating a student's oral response.\n\nAssignment prompt: ${assignmentPrompt}\n\nGenerate a single follow-up question that probes a gap or tests deeper understanding. Be specific and concise. Return only the question, no other text.`,
        },
        { role: 'user', content: context },
      ],
      max_tokens: 200,
      temperature: 0.7,
    },
    { timeout: 30_000 }
  )

  return response.choices[0]?.message?.content?.trim() ?? 'Can you elaborate further on your response?'
}
