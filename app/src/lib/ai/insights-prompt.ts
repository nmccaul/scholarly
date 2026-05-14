import type { ReadingAssignmentWithConfig } from '@/lib/assignments/repository'
import type { StudentCheckpointData } from '@/lib/reading/repository'

export function buildInsightsSystemPrompt(
  assignment: ReadingAssignmentWithConfig,
  students: StudentCheckpointData[]
): string {
  const { title, pointsPossible, config } = assignment
  const { sections, checkpointType, rubric } = config

  const sectionList = sections
    .map((s, i) => `${i + 1}. "${s.title}"`)
    .join('\n')

  const rubricList = rubric
    .map((c) => `- ${c.label} (${c.maxPoints} pts): ${c.description}`)
    .join('\n')

  const studentBlocks = students.map((student) => {
    const name = student.studentName ?? 'Unknown'
    const email = student.studentEmail ?? 'no email'
    const statusLabel =
      student.status === 'submitted' || student.status === 'graded'
        ? 'submitted'
        : student.status === 'in_progress'
        ? 'in_progress'
        : student.status
    const gradeLabel =
      student.finalGrade !== null
        ? `${student.finalGrade}/${pointsPossible}`
        : 'ungraded'

    const checkpointLines = sections.map((section, i) => {
      const cp = student.checkpoints.find((c) => c.sectionIndex === i)

      if (!cp || cp.status === 'locked') {
        return `  Section ${i + 1} "${section.title}" → LOCKED (not reached)`
      }

      const statusLabel =
        cp.status === 'passed'
          ? `PASSED (${cp.followUpCount} follow-up${cp.followUpCount !== 1 ? 's' : ''})`
          : cp.status === 'force_unlocked'
          ? `FORCE UNLOCKED (${cp.followUpCount} follow-up${cp.followUpCount !== 1 ? 's' : ''})`
          : `IN PROGRESS`

      const turnLines = cp.conversation
        .map((turn) => {
          const speaker = turn.role === 'student' ? 'Student' : 'AI'
          return `    ${speaker}: "${turn.text}"`
        })
        .join('\n')

      const feedbackLine = cp.aiFeedback
        ? `\n    AI Feedback: "${cp.aiFeedback}"`
        : ''

      return `  Section ${i + 1} "${section.title}" → ${statusLabel}\n${turnLines}${feedbackLine}`
    })

    return [
      `--- ${name} | ${email} | Status: ${statusLabel} | Grade: ${gradeLabel} ---`,
      ...checkpointLines,
      '---',
    ].join('\n')
  })

  return [
    'You are a teaching assistant with access to all student interactions from a reading assignment.',
    'Answer the teacher\'s questions based only on the data below. Be specific — cite student names',
    'and quote their actual words when relevant.',
    '',
    `ASSIGNMENT: "${title}" | ${sections.length} section${sections.length !== 1 ? 's' : ''} | ${pointsPossible} pts | checkpoint type: ${checkpointType}`,
    '',
    'SECTIONS:',
    sectionList,
    '',
    'RUBRIC:',
    rubricList,
    '',
    `STUDENT DATA (${students.length} student${students.length !== 1 ? 's' : ''}):`,
    '',
    ...studentBlocks,
  ].join('\n')
}
