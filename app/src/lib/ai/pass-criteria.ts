import type { CheckpointAction, CheckpointPassMode } from '@/types/domain'

/**
 * Builds the prompt fragment that tells the AI what allows a student to pass
 * the checkpoint, including the FAILING criteria. Used by both text mode
 * (evaluateCheckpointResponse) and voice mode (ReadingVoicePane buildInstructions).
 *
 * The failing criteria are MODE-SPECIFIC. In actions mode the teacher has
 * explicitly lowered the bar, so the AI should not also enforce
 * engagement-grade strictness on top.
 */
export function buildPassCriteriaPrompt(
  mode: CheckpointPassMode,
  actions: CheckpointAction[]
): string {
  if (mode === 'actions' && actions.length > 0) {
    const actionLines = actions.map((a) => {
      switch (a) {
        case 'ask_question':
          return '- ASK A QUESTION: the student asks any clear question about THIS section. It does not need to be deep or unique. "Why did the author write X?", "What does Y mean?", "How does this relate to Z?" all count. PASS them as soon as they ask a question.'
        case 'share_thought':
          return '- SHARE A THOUGHT: the student shares any thought, reaction, observation, or noticing about THIS section. It does not need to be profound. "I found the part about X interesting" or "This reminds me of Y" both count. PASS them as soon as they share.'
        case 'answer_question':
          return '- ANSWER A QUESTION: the student gives a real answer when you ask them something — not "I don\'t know" or a single word. As long as they attempt a genuine answer of more than a few words, PASS them.'
      }
    })

    return `PASSING CRITERIA — the teacher has explicitly chosen these actions as sufficient to pass. Pass the student AS SOON AS they do ANY ONE of them during the conversation:
${actionLines.join('\n')}

CRITICAL: the teacher has decided these actions are sufficient. Do NOT layer on top your own standards about "depth", "critical thinking", "specificity", or "substance". Length doesn't matter. Sophistication doesn't matter. If a student asks "What does this mean?" and the teacher selected ASK A QUESTION — they pass. Trust the teacher's bar.

MINIMUM FLOOR — only fail responses if they are clearly non-engagement:
- Empty, one-word, or fewer than 5 words total
- Completely off-topic (not about this section at all)
- Just repeating the prompt back verbatim
- The student has not yet attempted any of the selected actions`
  }

  // Engagement mode — the rigorous default
  return `PASSING CRITERIA — the student demonstrates critical engagement when their responses:
- Reference something SPECIFIC from this text (a moment, idea, claim, image, observation)
- Go beyond summary — they share interpretation, reaction, a question, or an insight
- Reflect their OWN thinking, not just paraphrasing
- Develop more than a single thought — at least a couple of connected ideas

Any of these count as engagement: interpreting a passage, reacting personally, noticing something surprising, raising a thoughtful question, connecting to something they know, articulating confusion they want to work through, or evaluating reasoning when reasoning is present.

FAILING — do not pass these responses:
- Pure summary or paraphrase with no interpretation, reaction, or question
- Generic reactions with no specific reasoning ("interesting", "I agree", "this was good")
- Responses under 30 words
- Responses that don't reference anything specific from this reading
- Responses that just repeat the prompt back`
}
