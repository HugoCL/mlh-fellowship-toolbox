import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { generateMentorAssignments } from "./lib/assignments"
import {
  getFellowForUser,
  requireFellowForUser,
  requireMentorForUser,
} from "./lib/auth"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { getProgramWeeks, isSameCalendarDay } from "./lib/programWeeks"
import { fellowValidator, mentorValidator } from "./lib/validators"

const roundValidator = v.object({
  _id: v.id("mentorMeetingRounds"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  roundNumber: v.number(),
  targetWeekLabel: v.string(),
  targetWeekStart: v.number(),
  createdAt: v.number(),
})

const assignmentValidator = v.object({
  _id: v.id("mentorMeetingAssignments"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  mentorId: v.id("mentors"),
  roundId: v.id("mentorMeetingRounds"),
  scheduled: v.boolean(),
  completed: v.boolean(),
  updatedAt: v.number(),
  updatedByUserId: v.optional(v.id("users")),
})

export const listMentors = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(mentorValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()
  },
})

export const addMentor = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.string(),
  },
  returns: v.id("mentors"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("mentors", {
      cohortId: args.cohortId,
      name: args.name.trim(),
      calendlyUrl: "",
      active: true,
      createdAt: Date.now(),
    })
  },
})

async function renumberMentorRounds(ctx: MutationCtx, cohortId: Id<"cohorts">) {
  const rounds = await ctx.db
    .query("mentorMeetingRounds")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const sorted = rounds.sort((a, b) => a.targetWeekStart - b.targetWeekStart)
  for (const [index, round] of sorted.entries()) {
    const roundNumber = index + 1
    if (round.roundNumber !== roundNumber) {
      await ctx.db.patch("mentorMeetingRounds", round._id, { roundNumber })
    }
  }
}

export const createRound = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    targetWeekLabel: v.string(),
    targetWeekStart: v.number(),
  },
  returns: v.id("mentorMeetingRounds"),
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const maxRoundNumber = rounds.reduce(
      (max, round) => Math.max(max, round.roundNumber),
      0,
    )

    return await ctx.db.insert("mentorMeetingRounds", {
      cohortId: args.cohortId,
      roundNumber: maxRoundNumber + 1,
      targetWeekLabel: args.targetWeekLabel.trim(),
      targetWeekStart: args.targetWeekStart,
      createdAt: Date.now(),
    })
  },
})

export const generateAllRounds = podManagementMutation({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const cohort = await ctx.db.get("cohorts", args.cohortId)
    if (!cohort) {
      throw new Error("Cohort not found")
    }

    const programWeeks = getProgramWeeks(cohort.startDate, cohort.endDate)
    const existing = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    let created = 0
    let skipped = 0
    let maxRoundNumber = existing.reduce(
      (max, round) => Math.max(max, round.roundNumber),
      0,
    )
    const now = Date.now()

    for (const week of programWeeks) {
      const alreadyExists = existing.some((round) =>
        isSameCalendarDay(round.targetWeekStart, week.weekStart),
      )
      if (alreadyExists) {
        skipped += 1
        continue
      }

      maxRoundNumber += 1
      const roundId = await ctx.db.insert("mentorMeetingRounds", {
        cohortId: args.cohortId,
        roundNumber: maxRoundNumber,
        targetWeekLabel: week.weekLabel,
        targetWeekStart: week.weekStart,
        createdAt: now,
      })
      const inserted = await ctx.db.get("mentorMeetingRounds", roundId)
      if (inserted) {
        existing.push(inserted)
      }
      created += 1
    }

    await renumberMentorRounds(ctx, args.cohortId)
    return { created, skipped }
  },
})

export const updateRound = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    roundId: v.id("mentorMeetingRounds"),
    targetWeekLabel: v.optional(v.string()),
    targetWeekStart: v.optional(v.number()),
  },
  returns: roundValidator,
  handler: async (ctx, args) => {
    const round = await ctx.db.get("mentorMeetingRounds", args.roundId)
    if (!round || round.cohortId !== args.cohortId) {
      throw new Error("Round not found")
    }

    const updates: {
      targetWeekLabel?: string
      targetWeekStart?: number
    } = {}

    if (args.targetWeekLabel !== undefined) {
      updates.targetWeekLabel = args.targetWeekLabel.trim()
    }
    if (args.targetWeekStart !== undefined) {
      updates.targetWeekStart = args.targetWeekStart
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch("mentorMeetingRounds", args.roundId, updates)
      await renumberMentorRounds(ctx, args.cohortId)
    }

    const updated = await ctx.db.get("mentorMeetingRounds", args.roundId)
    if (!updated) {
      throw new Error("Round not found")
    }
    return updated
  },
})

export const deleteRound = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    roundId: v.id("mentorMeetingRounds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get("mentorMeetingRounds", args.roundId)
    if (!round || round.cohortId !== args.cohortId) {
      throw new Error("Round not found")
    }

    const assignments = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect()

    for (const assignment of assignments) {
      await ctx.db.delete("mentorMeetingAssignments", assignment._id)
    }

    await ctx.db.delete("mentorMeetingRounds", args.roundId)
    await renumberMentorRounds(ctx, args.cohortId)
    return null
  },
})

export const generateAssignments = podManagementMutation({
  args: { cohortId: v.id("cohorts") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const activeMentors = mentors.filter((mentor) => mentor.active)
    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const sortedRounds = rounds.sort((a, b) => a.roundNumber - b.roundNumber)

    const generated = generateMentorAssignments({
      fellowIds: fellows.map((fellow) => fellow._id),
      mentorIds: activeMentors.map((mentor) => mentor._id),
      rounds: sortedRounds.map((round) => ({
        roundNumber: round.roundNumber,
        targetWeekLabel: round.targetWeekLabel,
        targetWeekStart: round.targetWeekStart,
      })),
    })

    const existing = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const item of existing) {
      await ctx.db.delete("mentorMeetingAssignments", item._id)
    }

    let created = 0
    for (const assignment of generated) {
      const round = sortedRounds.find(
        (item) => item.roundNumber === assignment.roundNumber,
      )
      if (!round) {
        continue
      }

      await ctx.db.insert("mentorMeetingAssignments", {
        cohortId: args.cohortId,
        fellowId: assignment.fellowId,
        mentorId: assignment.mentorId,
        roundId: round._id,
        scheduled: false,
        completed: false,
        updatedAt: Date.now(),
      })
      created += 1
    }

    return created
  },
})

export const listAssignments = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellows: v.array(fellowValidator),
    mentors: v.array(mentorValidator),
    rounds: v.array(roundValidator),
    assignments: v.array(assignmentValidator),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const assignments = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return {
      fellows,
      mentors,
      rounds: rounds.sort((a, b) => a.roundNumber - b.roundNumber),
      assignments,
    }
  },
})

export const updateAssignment = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    assignmentId: v.id("mentorMeetingAssignments"),
    scheduled: v.optional(v.boolean()),
    completed: v.optional(v.boolean()),
  },
  returns: assignmentValidator,
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(
      "mentorMeetingAssignments",
      args.assignmentId,
    )
    if (!assignment || assignment.cohortId !== args.cohortId) {
      throw new Error("Assignment not found")
    }

    if (ctx.membership.role === "fellow") {
      const fellow = await requireFellowForUser(
        ctx,
        args.cohortId,
        ctx.user._id,
      )
      if (assignment.fellowId !== fellow._id) {
        throw new Error("You can only update your own mentor meetings")
      }
    }

    const updates: {
      scheduled?: boolean
      completed?: boolean
      updatedAt: number
      updatedByUserId: typeof ctx.user._id
    } = {
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    }

    if (args.scheduled !== undefined) {
      updates.scheduled = args.scheduled
    }
    if (args.completed !== undefined) {
      updates.completed = args.completed
    }

    await ctx.db.patch("mentorMeetingAssignments", args.assignmentId, updates)
    const updated = await ctx.db.get(
      "mentorMeetingAssignments",
      args.assignmentId,
    )
    if (!updated) {
      throw new Error("Assignment not found")
    }
    return updated
  },
})

export const getMyMentorMeetings = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    assignments: v.array(assignmentValidator),
    mentors: v.array(mentorValidator),
    rounds: v.array(roundValidator),
  }),
  handler: async (ctx, args) => {
    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return { assignments: [], mentors: [], rounds: [] }
    }

    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const assignments = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
      .collect()

    return {
      assignments,
      mentors,
      rounds: rounds.sort((a, b) => a.roundNumber - b.roundNumber),
    }
  },
})

export const updateMyCalendly = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    calendlyUrl: v.string(),
  },
  returns: mentorValidator,
  handler: async (ctx, args) => {
    const mentor = await requireMentorForUser(ctx, args.cohortId, ctx.user._id)
    await ctx.db.patch("mentors", mentor._id, {
      calendlyUrl: args.calendlyUrl.trim(),
    })
    const updated = await ctx.db.get("mentors", mentor._id)
    if (!updated) {
      throw new Error("Mentor not found")
    }
    return updated
  },
})
