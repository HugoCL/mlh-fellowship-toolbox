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

function splitRoundsIntoWindows(
  rounds: MentorRoundInput[],
  windowCount: number,
): MentorRoundInput[][] {
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber)
  const windows: MentorRoundInput[][] = Array.from(
    { length: windowCount },
    () => [],
  )
  const baseSize = Math.floor(sorted.length / windowCount)
  const remainder = sorted.length % windowCount
  let index = 0
  for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
    const size = baseSize + (windowIndex < remainder ? 1 : 0)
    windows[windowIndex] = sorted.slice(index, index + size)
    index += size
  }
  return windows
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

  const fellows = [...fellowIds]
  const mentors = [...mentorIds]
  const assignments: MentorAssignmentInput[] = []
  const roundWindows = splitRoundsIntoWindows(rounds, mentors.length)

  // Each fellow meets each mentor once. Spread meetings across program windows
  // so mentors are not overloaded in consecutive weeks.
  for (const [windowIndex, windowRounds] of roundWindows.entries()) {
    if (windowRounds.length === 0) {
      continue
    }

    for (const [fellowIndex, fellowId] of fellows.entries()) {
      const mentorId = mentors[(fellowIndex + windowIndex) % mentors.length]
      const roundInWindow = Math.min(
        Math.floor((fellowIndex * windowRounds.length) / fellows.length),
        windowRounds.length - 1,
      )
      const round = windowRounds[roundInWindow]

      if (!mentorId || !round) {
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
