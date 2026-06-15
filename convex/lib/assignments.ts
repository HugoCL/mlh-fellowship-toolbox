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

  const assignments: MentorAssignmentInput[] = []
  const mentorLoad = new Map<string, number>()

  for (const mentorId of mentorIds) {
    mentorLoad.set(mentorId, 0)
  }

  for (const fellowId of fellowIds) {
    const usedMentors = new Set<string>()

    for (const round of rounds) {
      const sortedMentors = [...mentorIds].sort((a, b) => {
        const loadA = mentorLoad.get(a) ?? 0
        const loadB = mentorLoad.get(b) ?? 0
        if (loadA !== loadB) {
          return loadA - loadB
        }
        return a.localeCompare(b)
      })

      const mentorId =
        sortedMentors.find((id) => !usedMentors.has(id)) ??
        sortedMentors[round.roundNumber % sortedMentors.length]

      if (!mentorId) {
        throw new Error("Unable to assign mentor")
      }

      usedMentors.add(mentorId)
      mentorLoad.set(mentorId, (mentorLoad.get(mentorId) ?? 0) + 1)

      assignments.push({
        fellowId,
        mentorId,
        roundNumber: round.roundNumber,
      })
    }
  }

  return assignments
}
