import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { internalMutation } from "./_generated/server"
import { generateMentorAssignments, generatePeerPairs } from "./lib/assignments"

const SAMPLE_FELLOWS = [
  { name: "Alex Chen", email: "alex.chen@fellowship.dev" },
  { name: "Jordan Lee", email: "jordan.lee@fellowship.dev" },
  { name: "Sam Rivera", email: "sam.rivera@fellowship.dev" },
  { name: "Taylor Kim", email: "taylor.kim@fellowship.dev" },
  { name: "Morgan Patel", email: "morgan.patel@fellowship.dev" },
  { name: "Casey Nguyen", email: "casey.nguyen@fellowship.dev" },
  { name: "Riley Brooks", email: "riley.brooks@fellowship.dev" },
  { name: "Quinn Davis", email: "quinn.davis@fellowship.dev" },
] as const

const SAMPLE_MENTORS = [
  {
    name: "Dr. Priya Sharma",
    email: "priya.sharma@mentor.fellowship.dev",
  },
  {
    name: "Chris Okonkwo",
    email: "chris.okonkwo@mentor.fellowship.dev",
  },
  {
    name: "Jamie Foster",
    email: "jamie.foster@mentor.fellowship.dev",
  },
] as const

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

async function resolvePodCohortId(
  ctx: MutationCtx,
  args: {
    cohortId?: Id<"cohorts">
    programCode?: string
  },
): Promise<Id<"cohorts">> {
  if (args.cohortId) {
    const cohort = await ctx.db.get("cohorts", args.cohortId)
    if (!cohort) {
      throw new Error("Cohort not found")
    }
    if (!cohort.parentCohortId) {
      throw new Error(
        "Fellows and mentors belong to pods. Pass a pod cohortId or pod programCode (e.g. 26.SUM.B.5.1).",
      )
    }
    return cohort._id
  }

  if (args.programCode) {
    const normalized = args.programCode.trim()
    const cohort = await ctx.db
      .query("cohorts")
      .withIndex("by_program_code", (q) => q.eq("programCode", normalized))
      .unique()

    if (!cohort) {
      throw new Error(`No cohort found with program code ${normalized}`)
    }
    if (!cohort.parentCohortId) {
      throw new Error(
        "Fellows and mentors belong to pods. Pass a pod programCode (e.g. 26.SUM.B.5.1).",
      )
    }
    return cohort._id
  }

  const pods = await ctx.db.query("cohorts").collect()
  const podCandidates = pods.filter((cohort) => cohort.parentCohortId)

  for (const pod of podCandidates) {
    const existingFellow = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", pod._id))
      .first()

    const existingMentor = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", pod._id))
      .first()

    if (!existingFellow && !existingMentor) {
      return pod._id
    }
  }

  if (podCandidates.length === 1) {
    return podCandidates[0]._id
  }

  throw new Error(
    "Could not infer a pod to seed. Pass cohortId or programCode, or ensure exactly one pod exists.",
  )
}

async function seedFellowRecords(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  count: number,
  now: number,
) {
  const fellowIds: Id<"fellows">[] = []
  let fellowsAdded = 0

  for (const sample of SAMPLE_FELLOWS.slice(0, count)) {
    const existing = await ctx.db
      .query("fellows")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", cohortId).eq("email", sample.email),
      )
      .unique()

    if (existing) {
      fellowIds.push(existing._id)
      continue
    }

    const fellowId = await ctx.db.insert("fellows", {
      cohortId,
      name: sample.name,
      email: sample.email,
      calendlyUrl: `https://calendly.com/${sample.email.split("@")[0]}`,
      createdAt: now,
    })
    fellowIds.push(fellowId)
    fellowsAdded += 1
  }

  return { fellowIds, fellowsAdded }
}

async function seedMentorRecords(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  count: number,
  now: number,
) {
  const mentorIds: Id<"mentors">[] = []
  let mentorsAdded = 0

  for (const sample of SAMPLE_MENTORS.slice(0, count)) {
    const existing = await ctx.db
      .query("mentors")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", cohortId).eq("email", sample.email),
      )
      .unique()

    if (existing) {
      mentorIds.push(existing._id)
      continue
    }

    const mentorId = await ctx.db.insert("mentors", {
      cohortId,
      name: sample.name,
      email: sample.email,
      calendlyUrl: `https://calendly.com/${sample.email.split("@")[0]}`,
      active: true,
      createdAt: now,
    })
    mentorIds.push(mentorId)
    mentorsAdded += 1
  }

  return { mentorIds, mentorsAdded }
}

async function seedPeerAndLeaderRecords(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  fellowIds: Id<"fellows">[],
) {
  const existingPeers = await ctx.db
    .query("peerOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const existingPeerKeys = new Set(
    existingPeers.map((item) => `${item.fellowAId}:${item.fellowBId}`),
  )

  let peersCreated = 0
  for (const [fellowAId, fellowBId] of generatePeerPairs(fellowIds)) {
    const key = `${fellowAId}:${fellowBId}`
    if (existingPeerKeys.has(key)) {
      continue
    }

    await ctx.db.insert("peerOneOnOnes", {
      cohortId,
      fellowAId,
      fellowBId,
      status: "notStarted",
      updatedAt: Date.now(),
    })
    peersCreated += 1
  }

  const instances = await ctx.db
    .query("oneOnOneInstances")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const existingLeaderRecords = await ctx.db
    .query("leaderOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  let leaderRecordsCreated = 0
  for (const fellowId of fellowIds) {
    for (const instance of instances) {
      const alreadyExists = existingLeaderRecords.some(
        (record) =>
          record.fellowId === fellowId && record.instanceId === instance._id,
      )

      if (alreadyExists) {
        continue
      }

      await ctx.db.insert("leaderOneOnOnes", {
        cohortId,
        fellowId,
        instanceId: instance._id,
        status: "notStarted",
        updatedAt: Date.now(),
      })
      leaderRecordsCreated += 1
    }
  }

  return { peersCreated, leaderRecordsCreated }
}

async function seedMentorRounds(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  cohortStartDate: number,
  now: number,
) {
  const existingRounds = await ctx.db
    .query("mentorMeetingRounds")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  if (existingRounds.length >= 2) {
    return {
      rounds: existingRounds.sort((a, b) => a.roundNumber - b.roundNumber),
      roundsAdded: 0,
    }
  }

  const defaultRounds = [
    {
      targetWeekLabel: "Week 3",
      targetWeekStart: cohortStartDate + 2 * MS_PER_WEEK,
    },
    {
      targetWeekLabel: "Week 6",
      targetWeekStart: cohortStartDate + 5 * MS_PER_WEEK,
    },
  ]

  const rounds = [...existingRounds]
  let roundsAdded = 0

  for (const round of defaultRounds) {
    const alreadyExists = rounds.some(
      (item) => item.targetWeekLabel === round.targetWeekLabel,
    )
    if (alreadyExists) {
      continue
    }

    const roundId = await ctx.db.insert("mentorMeetingRounds", {
      cohortId,
      roundNumber: rounds.length + 1,
      targetWeekLabel: round.targetWeekLabel,
      targetWeekStart: round.targetWeekStart,
      createdAt: now,
    })

    const inserted = await ctx.db.get("mentorMeetingRounds", roundId)
    if (inserted) {
      rounds.push(inserted)
      roundsAdded += 1
    }
  }

  return {
    rounds: rounds.sort((a, b) => a.roundNumber - b.roundNumber),
    roundsAdded,
  }
}

async function seedMentorAssignments(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  fellowIds: Id<"fellows">[],
  mentorIds: Id<"mentors">[],
  rounds: Array<{
    _id: Id<"mentorMeetingRounds">
    roundNumber: number
    targetWeekLabel: string
    targetWeekStart: number
  }>,
) {
  if (fellowIds.length === 0 || mentorIds.length < 2 || rounds.length < 2) {
    return 0
  }

  const generated = generateMentorAssignments({
    fellowIds,
    mentorIds,
    rounds: rounds.map((round) => ({
      roundNumber: round.roundNumber,
      targetWeekLabel: round.targetWeekLabel,
      targetWeekStart: round.targetWeekStart,
    })),
  })

  const existing = await ctx.db
    .query("mentorMeetingAssignments")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  if (existing.length > 0) {
    return 0
  }

  let assignmentsCreated = 0
  for (const assignment of generated) {
    const round = rounds.find(
      (item) => item.roundNumber === assignment.roundNumber,
    )
    if (!round) {
      continue
    }

    await ctx.db.insert("mentorMeetingAssignments", {
      cohortId,
      fellowId: assignment.fellowId,
      mentorId: assignment.mentorId,
      roundId: round._id,
      scheduled: false,
      completed: false,
      updatedAt: Date.now(),
    })
    assignmentsCreated += 1
  }

  return assignmentsCreated
}

export const seedPod = internalMutation({
  args: {
    cohortId: v.optional(v.id("cohorts")),
    programCode: v.optional(v.string()),
    fellowCount: v.optional(v.number()),
    mentorCount: v.optional(v.number()),
    generatePairs: v.optional(v.boolean()),
    generateAssignments: v.optional(v.boolean()),
  },
  returns: v.object({
    cohortId: v.id("cohorts"),
    programCode: v.string(),
    fellowIds: v.array(v.id("fellows")),
    mentorIds: v.array(v.id("mentors")),
    fellowsAdded: v.number(),
    mentorsAdded: v.number(),
    peersCreated: v.number(),
    leaderRecordsCreated: v.number(),
    roundsAdded: v.number(),
    assignmentsCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    const cohortId = await resolvePodCohortId(ctx, args)
    const cohort = await ctx.db.get("cohorts", cohortId)
    if (!cohort) {
      throw new Error("Pod not found")
    }

    const fellowCount = Math.min(
      Math.max(args.fellowCount ?? SAMPLE_FELLOWS.length, 2),
      SAMPLE_FELLOWS.length,
    )
    const mentorCount = Math.min(
      Math.max(args.mentorCount ?? SAMPLE_MENTORS.length, 2),
      SAMPLE_MENTORS.length,
    )
    const shouldGeneratePairs = args.generatePairs ?? true
    const shouldGenerateAssignments = args.generateAssignments ?? true
    const now = Date.now()

    const { fellowIds, fellowsAdded } = await seedFellowRecords(
      ctx,
      cohortId,
      fellowCount,
      now,
    )
    const { mentorIds, mentorsAdded } = await seedMentorRecords(
      ctx,
      cohortId,
      mentorCount,
      now,
    )

    let peersCreated = 0
    let leaderRecordsCreated = 0

    if (shouldGeneratePairs && fellowIds.length >= 2) {
      const generated = await seedPeerAndLeaderRecords(ctx, cohortId, fellowIds)
      peersCreated = generated.peersCreated
      leaderRecordsCreated = generated.leaderRecordsCreated
    }

    const { rounds, roundsAdded } = await seedMentorRounds(
      ctx,
      cohortId,
      cohort.startDate,
      now,
    )

    let assignmentsCreated = 0
    if (shouldGenerateAssignments) {
      assignmentsCreated = await seedMentorAssignments(
        ctx,
        cohortId,
        fellowIds,
        mentorIds,
        rounds,
      )
    }

    return {
      cohortId,
      programCode: cohort.programCode,
      fellowIds,
      mentorIds,
      fellowsAdded,
      mentorsAdded,
      peersCreated,
      leaderRecordsCreated,
      roundsAdded,
      assignmentsCreated,
    }
  },
})
