import { v } from "convex/values"
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

    return await ctx.db.insert("mentorMeetingRounds", {
      cohortId: args.cohortId,
      roundNumber: rounds.length + 1,
      targetWeekLabel: args.targetWeekLabel.trim(),
      targetWeekStart: args.targetWeekStart,
      createdAt: Date.now(),
    })
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
