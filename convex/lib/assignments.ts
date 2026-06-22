import type { Id } from "../_generated/dataModel"

export function generatePeerPairs(
  fellowIds: Id<"fellows">[],
): Array<[Id<"fellows">, Id<"fellows">]> {
  const pairs: Array<[Id<"fellows">, Id<"fellows">]> = []
  for (let i = 0; i < fellowIds.length; i += 1) {
    for (let j = i + 1; j < fellowIds.length; j += 1) {
      const a = fellowIds[i]
      const b = fellowIds[j]
      if (a && b) {
        pairs.push(a < b ? [a, b] : [b, a])
      }
    }
  }
  return pairs
}

export type MentorRoundInput = {
  roundNumber: number
  targetWeekLabel: string
  targetWeekStart: number
}

export type MentorAssignmentInput = {
  fellowId: Id<"fellows">
  mentorId: Id<"mentors">
  roundNumber: number
}

export function generateMentorAssignments(args: {
  fellowIds: Id<"fellows">[]
  mentorIds: Id<"mentors">[]
  rounds: MentorRoundInput[]
}): MentorAssignmentInput[] {
  const { fellowIds, mentorIds, rounds } = args
  if (mentorIds.length < 2 || rounds.length < 2) {
    throw new Error("Need at least 2 mentors and 2 rounds")
  }

  if (mentorIds.length > rounds.length) {
    throw new Error(
      `Need at least ${mentorIds.length} mentor meeting weeks for fellows to meet each mentor (have ${rounds.length})`,
    )
  }

  const sortedFellows = [...fellowIds].sort((a, b) => a.localeCompare(b))
  const sortedMentors = [...mentorIds].sort((a, b) => a.localeCompare(b))
  const assignments: MentorAssignmentInput[] = []

  for (const [roundIndex, round] of rounds.entries()) {
    for (const [fellowIndex, fellowId] of sortedFellows.entries()) {
      const mentorId =
        sortedMentors[(fellowIndex + roundIndex) % sortedMentors.length]

      if (!mentorId) {
        throw new Error("Unable to assign mentor")
      }

      assignments.push({
        fellowId,
        mentorId,
        roundNumber: round.roundNumber,
      })
    }
  }

  return assignments
}
