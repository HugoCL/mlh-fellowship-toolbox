import { describe, expect, it } from "vitest"
import {
  generateMentorAssignments,
  generatePeerPairs,
  type MentorRoundInput,
} from "../convex/lib/assignments"

const fellow = (id: string) => id as never
const mentor = (id: string) => id as never

const twoRounds: MentorRoundInput[] = [
  { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
  { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
]

describe("generatePeerPairs", () => {
  it("returns no pairs for an empty list", () => {
    expect(generatePeerPairs([])).toEqual([])
  })

  it("returns no pairs for a single fellow", () => {
    expect(generatePeerPairs([fellow("only")])).toEqual([])
  })

  it("creates one canonical pair for two fellows", () => {
    const a = fellow("fellow_a")
    const b = fellow("fellow_b")

    expect(generatePeerPairs([a, b])).toEqual([[a, b]])
    expect(generatePeerPairs([b, a])).toEqual([[a, b]])
  })

  it("creates unique canonical pairs for three fellows", () => {
    const pairs = generatePeerPairs([
      fellow("fellow_a"),
      fellow("fellow_b"),
      fellow("fellow_c"),
    ])

    expect(pairs).toHaveLength(3)
    expect(pairs).toEqual(
      expect.arrayContaining([
        [fellow("fellow_a"), fellow("fellow_b")],
        [fellow("fellow_a"), fellow("fellow_c")],
        [fellow("fellow_b"), fellow("fellow_c")],
      ]),
    )
    expect(pairs.every(([a, b]) => a < b)).toBe(true)
  })
})

describe("generateMentorAssignments", () => {
  it("throws when fewer than two mentors are provided", () => {
    expect(() =>
      generateMentorAssignments({
        fellowIds: [fellow("f1")],
        mentorIds: [mentor("m1")],
        rounds: twoRounds,
      }),
    ).toThrow("Need at least 2 mentors and 2 rounds")
  })

  it("throws when fewer than two rounds are provided", () => {
    expect(() =>
      generateMentorAssignments({
        fellowIds: [fellow("f1")],
        mentorIds: [mentor("m1"), mentor("m2")],
        rounds: [
          { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
        ],
      }),
    ).toThrow("Need at least 2 mentors and 2 rounds")
  })

  it("assigns two different mentors per fellow across rounds", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [fellow("f1"), fellow("f2")],
      mentorIds: [mentor("m1"), mentor("m2")],
      rounds: twoRounds,
    })

    expect(assignments).toHaveLength(4)

    for (const fellowId of ["f1", "f2"]) {
      const fellowAssignments = assignments.filter(
        (item) => item.fellowId === fellowId,
      )
      expect(fellowAssignments).toHaveLength(2)
      expect(fellowAssignments[0]?.mentorId).not.toBe(
        fellowAssignments[1]?.mentorId,
      )
    }
  })

  it("balances mentor load across fellows", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [fellow("f1"), fellow("f2"), fellow("f3")],
      mentorIds: [mentor("m1"), mentor("m2")],
      rounds: twoRounds,
    })

    expect(assignments).toHaveLength(6)

    const mentorCounts = new Map<string, number>()
    for (const assignment of assignments) {
      mentorCounts.set(
        assignment.mentorId,
        (mentorCounts.get(assignment.mentorId) ?? 0) + 1,
      )
    }

    expect(mentorCounts.get("m1")).toBe(3)
    expect(mentorCounts.get("m2")).toBe(3)
  })

  it("includes round numbers on every assignment", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [fellow("f1")],
      mentorIds: [mentor("m1"), mentor("m2"), mentor("m3")],
      rounds: [
        { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
        { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
        { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
      ],
    })

    expect(assignments).toHaveLength(3)
    expect(assignments.map((item) => item.roundNumber)).toEqual([1, 2, 3])
    expect(new Set(assignments.map((item) => item.mentorId)).size).toBe(3)
  })

  it("never assigns the same mentor twice to one fellow in one generation pass", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [fellow("f1"), fellow("f2")],
      mentorIds: [mentor("m1"), mentor("m2"), mentor("m3")],
      rounds: twoRounds,
    })

    for (const fellowId of ["f1", "f2"]) {
      const mentorsForFellow = assignments
        .filter((item) => item.fellowId === fellowId)
        .map((item) => item.mentorId)
      expect(new Set(mentorsForFellow).size).toBe(mentorsForFellow.length)
    }
  })
})
