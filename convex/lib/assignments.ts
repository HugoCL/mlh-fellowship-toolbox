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

function sortMentorsByLoad(
  mentorIds: Id<"mentors">[],
  load: Map<string, number>,
): Id<"mentors">[] {
  return [...mentorIds].sort((a, b) => {
    const loadA = load.get(a) ?? 0
    const loadB = load.get(b) ?? 0
    if (loadA !== loadB) {
      return loadA - loadB
    }
    return a.localeCompare(b)
  })
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

  const assignments: MentorAssignmentInput[] = []
  const mentorsMetByFellow = new Map<string, Set<string>>()

  for (const fellowId of fellowIds) {
    mentorsMetByFellow.set(fellowId, new Set())
  }

  for (const round of rounds) {
    const roundLoad = new Map<string, number>()
    for (const mentorId of mentorIds) {
      roundLoad.set(mentorId, 0)
    }

    const fellowsForRound = [...fellowIds].sort((a, b) => {
      const metA = mentorsMetByFellow.get(a)?.size ?? 0
      const metB = mentorsMetByFellow.get(b)?.size ?? 0
      if (metA !== metB) {
        return metA - metB
      }
      return a.localeCompare(b)
    })

    for (const fellowId of fellowsForRound) {
      const metMentors = mentorsMetByFellow.get(fellowId) ?? new Set()
      const mentorsWithCapacity = mentorIds.filter(
        (mentorId) =>
          (roundLoad.get(mentorId) ?? 0) < MAX_FELLOWS_PER_MENTOR_PER_ROUND,
      )

      const unmetMentors = mentorsWithCapacity.filter(
        (mentorId) => !metMentors.has(mentorId),
      )
      const candidateMentors =
        unmetMentors.length > 0 ? unmetMentors : mentorsWithCapacity

      const sortedCandidates = sortMentorsByLoad(candidateMentors, roundLoad)
      const mentorId = sortedCandidates[0]

      if (!mentorId) {
        throw new Error(
          `Unable to assign mentor for ${round.targetWeekLabel}: each mentor is already at the ${MAX_FELLOWS_PER_MENTOR_PER_ROUND}-fellow weekly limit`,
        )
      }

      metMentors.add(mentorId)
      mentorsMetByFellow.set(fellowId, metMentors)
      roundLoad.set(mentorId, (roundLoad.get(mentorId) ?? 0) + 1)

      assignments.push({
        fellowId,
        mentorId,
        roundNumber: round.roundNumber,
      })
    }
  }

  return assignments
}
