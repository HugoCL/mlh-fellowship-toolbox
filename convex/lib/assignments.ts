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

const MAX_FELLOWS_PER_MENTOR_PER_ROUND = 2

export function generateMentorAssignments(args: {
  fellowIds: Id<"fellows">[]
  mentorIds: Id<"mentors">[]
  rounds: MentorRoundInput[]
}): MentorAssignmentInput[] {
  const { fellowIds, mentorIds, rounds } = args
  if (mentorIds.length < 2 || rounds.length < 2) {
    throw new Error("Need at least 2 mentors and 2 rounds")
  }

  const weeklyCapacity = mentorIds.length * MAX_FELLOWS_PER_MENTOR_PER_ROUND
  if (fellowIds.length > weeklyCapacity) {
    throw new Error(
      `Too many fellows (${fellowIds.length}) for ${mentorIds.length} mentors at max ${MAX_FELLOWS_PER_MENTOR_PER_ROUND} per week (capacity ${weeklyCapacity} per week)`,
    )
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
    const roundLoad = new Map<string, number>()
    for (const mentorId of sortedMentors) {
      roundLoad.set(mentorId, 0)
    }

    for (const [fellowIndex, fellowId] of sortedFellows.entries()) {
      const mentorId =
        sortedMentors[(fellowIndex + roundIndex) % sortedMentors.length]

      if (!mentorId) {
        throw new Error("Unable to assign mentor")
      }

      const mentorLoad = (roundLoad.get(mentorId) ?? 0) + 1
      if (mentorLoad > MAX_FELLOWS_PER_MENTOR_PER_ROUND) {
        throw new Error(
          `Unable to assign mentor for ${round.targetWeekLabel}: each mentor is already at the ${MAX_FELLOWS_PER_MENTOR_PER_ROUND}-fellow weekly limit`,
        )
      }

      roundLoad.set(mentorId, mentorLoad)
      assignments.push({
        fellowId,
        mentorId,
        roundNumber: round.roundNumber,
      })
    }
  }

  return assignments
}
