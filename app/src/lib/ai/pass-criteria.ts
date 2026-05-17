import type { CheckpointAction, CheckpointPassMode } from '@/types/domain'

/**
 * Builds the prompt fragment that tells the AI what allows a student to pass
 * the checkpoint. Used by both text mode (evaluateCheckpointResponse) and voice
 * mode (ReadingVoicePane buildInstructions).
 */
export function buildPassCriteriaPrompt(
  mode: CheckpointPassMode,
  actions: CheckpointAction[]
): string {
  if (mode === 'actions' && actions.length > 0) {
    const actionLines = actions.map((a) => {
      switch (a) {
        case 'ask_question':
          return '- Asks a genuine question about the section (about its content, meaning, or implications). The question must be specific, not generic ("what is this about?" does not count).'
        case 'share_thought':
          return '- Shares a thought, observation, reaction, or insight about the section. The thought must reference something specific from the reading.'
        case 'answer_question':
          return '- Substantively answers a question you (the AI) ask them. A one-word or vague answer does not count — they need to engage with the question.'
      }
    })
    return `PASSING CRITERIA — the teacher has configured this checkpoint to pass when the student does ANY of the following during the conversation:
${actionLines.join('\n')}

You should still ask follow-up questions to probe and clarify, but pass them as soon as they substantively complete at least ONE of the above. Do not require them to do all of them — any one with real substance is enough.`
  }

  // Default: 'engagement' mode (or 'actions' with no actions selected — fall through to defaults)
  return `PASSING CRITERIA — the student demonstrates critical engagement when their responses:
- Reference something SPECIFIC from this text (a moment, idea, claim, image, observation)
- Go beyond summary — they share interpretation, reaction, a question, or an insight
- Reflect their OWN thinking, not just paraphrasing
- Develop more than a single thought — at least a couple of connected ideas

Any of these count as engagement: interpreting a passage, reacting personally, noticing something surprising, raising a thoughtful question, connecting to something they know, articulating confusion they want to work through, or evaluating reasoning when reasoning is present.`
}
