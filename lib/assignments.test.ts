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

function mentorLoadPerRound(
  assignments: ReturnType<typeof generateMentorAssignments>,
  roundNumber: number,
): Map<string, number> {
  const load = new Map<string, number>()
  for (const assignment of assignments) {
    if (assignment.roundNumber !== roundNumber) {
      continue
    }
    load.set(assignment.mentorId, (load.get(assignment.mentorId) ?? 0) + 1)
  }
  return load
}

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

  it("still generates assignments when fellows exceed a two-per-mentor weekly target", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [
        fellow("f1"),
        fellow("f2"),
        fellow("f3"),
        fellow("f4"),
        fellow("f5"),
        fellow("f6"),
        fellow("f7"),
      ],
      mentorIds: [mentor("m1"), mentor("m2"), mentor("m3")],
      rounds: [
        { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
        { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
        { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
      ],
    })

    expect(assignments).toHaveLength(21)

    const weekOneLoad = mentorLoadPerRound(assignments, 1)
    expect(weekOneLoad.get("m1")).toBe(3)
    expect(weekOneLoad.get("m2")).toBe(2)
    expect(weekOneLoad.get("m3")).toBe(2)
  })

  it("throws when there are more mentors than rounds", () => {
    expect(() =>
      generateMentorAssignments({
        fellowIds: [fellow("f1"), fellow("f2")],
        mentorIds: [mentor("m1"), mentor("m2"), mentor("m3")],
        rounds: twoRounds,
      }),
    ).toThrow("Need at least 3 mentor meeting weeks")
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

  it("distributes fellows across mentors each round", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [
        fellow("f1"),
        fellow("f2"),
        fellow("f3"),
        fellow("f4"),
        fellow("f5"),
        fellow("f6"),
      ],
      mentorIds: [mentor("m1"), mentor("m2"), mentor("m3")],
      rounds: [
        { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
        { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
        { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
      ],
    })

    for (const roundNumber of [1, 2, 3]) {
      const load = mentorLoadPerRound(assignments, roundNumber)
      expect(load.size).toBe(3)
      for (const count of load.values()) {
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  it("balances mentor load within each round", () => {
    const assignments = generateMentorAssignments({
      fellowIds: [fellow("f1"), fellow("f2"), fellow("f3")],
      mentorIds: [mentor("m1"), mentor("m2")],
      rounds: twoRounds,
    })

    expect(assignments).toHaveLength(6)

    for (const roundNumber of [1, 2]) {
      const load = mentorLoadPerRound(assignments, roundNumber)
      const counts = [...load.values()].sort((a, b) => a - b)
      expect(counts).toEqual([1, 2])
    }
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
      rounds: [
        { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
        { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
        { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
      ],
    })

    for (const fellowId of ["f1", "f2"]) {
      const mentorsForFellow = assignments
        .filter((item) => item.fellowId === fellowId)
        .map((item) => item.mentorId)
      expect(new Set(mentorsForFellow).size).toBe(mentorsForFellow.length)
    }
  })

  it("ensures each fellow meets every mentor when rounds allow it", () => {
    const mentorIds = [mentor("m1"), mentor("m2"), mentor("m3")]
    const fellowIds = [fellow("f1"), fellow("f2"), fellow("f3"), fellow("f4")]
    const rounds = [
      { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
      { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
      { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
    ]

    const assignments = generateMentorAssignments({
      fellowIds,
      mentorIds,
      rounds,
    })

    for (const fellowId of fellowIds) {
      const mentorsForFellow = new Set(
        assignments
          .filter((item) => item.fellowId === fellowId)
          .map((item) => item.mentorId),
      )
      expect(mentorsForFellow.size).toBe(mentorIds.length)
      for (const mentorId of mentorIds) {
        expect(mentorsForFellow.has(mentorId)).toBe(true)
      }
    }
  })

  it("distributes fourteen fellows across seven mentors without clustering", () => {
    const mentorIds = Array.from({ length: 7 }, (_, index) =>
      mentor(`m${index + 1}`),
    )
    const fellowIds = Array.from({ length: 14 }, (_, index) =>
      fellow(`f${index + 1}`),
    )
    const rounds = Array.from({ length: 7 }, (_, index) => ({
      roundNumber: index + 1,
      targetWeekLabel: `Week ${index + 2}`,
      targetWeekStart: index + 1,
    }))

    const assignments = generateMentorAssignments({
      fellowIds,
      mentorIds,
      rounds,
    })

    for (const roundNumber of rounds.map((round) => round.roundNumber)) {
      const load = mentorLoadPerRound(assignments, roundNumber)
      for (const count of load.values()) {
        expect(count).toBe(2)
      }
    }

    for (const fellowId of fellowIds) {
      const mentorsForFellow = new Set(
        assignments
          .filter((item) => item.fellowId === fellowId)
          .map((item) => item.mentorId),
      )
      expect(mentorsForFellow.size).toBe(mentorIds.length)
    }
  })

  it("does not assign repeat mentors before full coverage is possible", () => {
    const mentorIds = [mentor("m1"), mentor("m2"), mentor("m3")]
    const fellowIds = [
      fellow("f1"),
      fellow("f2"),
      fellow("f3"),
      fellow("f4"),
      fellow("f5"),
      fellow("f6"),
    ]
    const rounds = [
      { roundNumber: 1, targetWeekLabel: "Week 1", targetWeekStart: 1 },
      { roundNumber: 2, targetWeekLabel: "Week 2", targetWeekStart: 2 },
      { roundNumber: 3, targetWeekLabel: "Week 3", targetWeekStart: 3 },
    ]

    const assignments = generateMentorAssignments({
      fellowIds,
      mentorIds,
      rounds,
    })

    for (const fellowId of fellowIds) {
      const mentorsForFellow = assignments
        .filter((item) => item.fellowId === fellowId)
        .map((item) => item.mentorId)
      expect(new Set(mentorsForFellow).size).toBe(mentorIds.length)
    }
  })

  it("assigns each fellow once per mentor and leaves extra weeks empty", () => {
    const mentorIds = [mentor("m1"), mentor("m2"), mentor("m3")]
    const fellowIds = Array.from({ length: 14 }, (_, index) =>
      fellow(`f${index + 1}`),
    )
    const rounds = Array.from({ length: 7 }, (_, index) => ({
      roundNumber: index + 1,
      targetWeekLabel: `Week ${index + 2}`,
      targetWeekStart: index + 1,
    }))

    const assignments = generateMentorAssignments({
      fellowIds,
      mentorIds,
      rounds,
    })

    expect(assignments).toHaveLength(14 * mentorIds.length)

    for (const fellowId of fellowIds) {
      const fellowAssignments = assignments.filter(
        (item) => item.fellowId === fellowId,
      )
      expect(fellowAssignments).toHaveLength(mentorIds.length)
      expect(new Set(fellowAssignments.map((item) => item.mentorId)).size).toBe(
        mentorIds.length,
      )
      expect(
        new Set(fellowAssignments.map((item) => item.roundNumber)).size,
      ).toBe(mentorIds.length)
    }

    const assignedRoundNumbers = new Set(
      assignments.map((item) => item.roundNumber),
    )
    expect(assignedRoundNumbers).toEqual(new Set([1, 2, 3]))
  })
})
