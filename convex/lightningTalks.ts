import { v } from "convex/values"
import { getFellowForUser, requireFellowForUser } from "./lib/auth"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import {
  getProgramWeeks,
  getSlotDateInProgramWeek,
  isSameCalendarDay,
  weekdayValidator,
} from "./lib/programWeeks"
import { fellowValidator } from "./lib/validators"

const slotValidator = v.object({
  _id: v.id("lightningTalkSlots"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  slotDate: v.number(),
  maxEnrollments: v.number(),
  createdAt: v.number(),
})

const talkValidator = v.object({
  _id: v.id("lightningTalks"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  slotId: v.id("lightningTalkSlots"),
  topic: v.string(),
  completed: v.boolean(),
  updatedAt: v.number(),
  updatedByUserId: v.optional(v.id("users")),
})

export const listLightningTalks = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellows: v.array(fellowValidator),
    slots: v.array(slotValidator),
    talks: v.array(talkValidator),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const slots = await ctx.db
      .query("lightningTalkSlots")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const talks = await ctx.db
      .query("lightningTalks")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return {
      fellows,
      slots: slots.sort((a, b) => a.slotDate - b.slotDate),
      talks,
    }
  },
})

export const createSlot = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    slotDate: v.number(),
    maxEnrollments: v.optional(v.number()),
  },
  returns: v.id("lightningTalkSlots"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("lightningTalkSlots", {
      cohortId: args.cohortId,
      slotDate: args.slotDate,
      maxEnrollments: args.maxEnrollments ?? 1,
      createdAt: Date.now(),
    })
  },
})

export const generateAllSlots = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    dayOfWeek: weekdayValidator,
  },
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
      .query("lightningTalkSlots")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    let created = 0
    let skipped = 0
    const now = Date.now()

    for (const week of programWeeks) {
      const slotDate = getSlotDateInProgramWeek(week.weekStart, args.dayOfWeek)
      const alreadyExists = existing.some((slot) =>
        isSameCalendarDay(slot.slotDate, slotDate),
      )
      if (alreadyExists) {
        skipped += 1
        continue
      }

      const slotId = await ctx.db.insert("lightningTalkSlots", {
        cohortId: args.cohortId,
        slotDate,
        maxEnrollments: 1,
        createdAt: now,
      })
      const inserted = await ctx.db.get("lightningTalkSlots", slotId)
      if (inserted) {
        existing.push(inserted)
      }
      created += 1
    }

    return { created, skipped }
  },
})

export const updateSlot = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    slotId: v.id("lightningTalkSlots"),
    slotDate: v.optional(v.number()),
    maxEnrollments: v.optional(v.number()),
  },
  returns: slotValidator,
  handler: async (ctx, args) => {
    const slot = await ctx.db.get("lightningTalkSlots", args.slotId)
    if (!slot || slot.cohortId !== args.cohortId) {
      throw new Error("Slot not found")
    }

    const updates: {
      slotDate?: number
      maxEnrollments?: number
    } = {}

    if (args.slotDate !== undefined) {
      updates.slotDate = args.slotDate
    }
    if (args.maxEnrollments !== undefined) {
      updates.maxEnrollments = args.maxEnrollments
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch("lightningTalkSlots", args.slotId, updates)
    }

    const updated = await ctx.db.get("lightningTalkSlots", args.slotId)
    if (!updated) {
      throw new Error("Slot not found")
    }
    return updated
  },
})

export const deleteSlot = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    slotId: v.id("lightningTalkSlots"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get("lightningTalkSlots", args.slotId)
    if (!slot || slot.cohortId !== args.cohortId) {
      throw new Error("Slot not found")
    }

    const talks = await ctx.db
      .query("lightningTalks")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect()

    if (talks.length > 0) {
      throw new Error(
        "Remove or reassign enrolled talks before deleting this slot.",
      )
    }

    await ctx.db.delete("lightningTalkSlots", args.slotId)
    return null
  },
})

export const enroll = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    slotId: v.id("lightningTalkSlots"),
    topic: v.string(),
  },
  returns: talkValidator,
  handler: async (ctx, args) => {
    const fellow = await requireFellowForUser(ctx, args.cohortId, ctx.user._id)
    const slot = await ctx.db.get("lightningTalkSlots", args.slotId)
    if (!slot || slot.cohortId !== args.cohortId) {
      throw new Error("Slot not found")
    }

    const existingForFellow = await ctx.db
      .query("lightningTalks")
      .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
      .unique()

    if (existingForFellow) {
      throw new Error("You already have a lightning talk enrolled")
    }

    const talksInSlot = await ctx.db
      .query("lightningTalks")
      .withIndex("by_slot", (q) => q.eq("slotId", args.slotId))
      .collect()

    if (talksInSlot.length >= slot.maxEnrollments) {
      throw new Error("This slot is full")
    }

    const talkId = await ctx.db.insert("lightningTalks", {
      cohortId: args.cohortId,
      fellowId: fellow._id,
      slotId: args.slotId,
      topic: args.topic.trim(),
      completed: false,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const created = await ctx.db.get("lightningTalks", talkId)
    if (!created) {
      throw new Error("Lightning talk not found")
    }
    return created
  },
})

export const assignTalk = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    slotId: v.id("lightningTalkSlots"),
    topic: v.string(),
  },
  returns: talkValidator,
  handler: async (ctx, args) => {
    const fellow = await ctx.db.get("fellows", args.fellowId)
    if (!fellow || fellow.cohortId !== args.cohortId) {
      throw new Error("Fellow not found")
    }

    const existing = await ctx.db
      .query("lightningTalks")
      .withIndex("by_fellow", (q) => q.eq("fellowId", args.fellowId))
      .unique()

    if (existing) {
      await ctx.db.patch("lightningTalks", existing._id, {
        slotId: args.slotId,
        topic: args.topic.trim(),
        updatedAt: Date.now(),
        updatedByUserId: ctx.user._id,
      })
      const updated = await ctx.db.get("lightningTalks", existing._id)
      if (!updated) {
        throw new Error("Lightning talk not found")
      }
      return updated
    }

    const talkId = await ctx.db.insert("lightningTalks", {
      cohortId: args.cohortId,
      fellowId: args.fellowId,
      slotId: args.slotId,
      topic: args.topic.trim(),
      completed: false,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const created = await ctx.db.get("lightningTalks", talkId)
    if (!created) {
      throw new Error("Lightning talk not found")
    }
    return created
  },
})

export const updateTalkCompletion = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    talkId: v.id("lightningTalks"),
    completed: v.boolean(),
  },
  returns: talkValidator,
  handler: async (ctx, args) => {
    const talk = await ctx.db.get("lightningTalks", args.talkId)
    if (!talk || talk.cohortId !== args.cohortId) {
      throw new Error("Lightning talk not found")
    }

    if (ctx.membership.role === "fellow") {
      const fellow = await requireFellowForUser(
        ctx,
        args.cohortId,
        ctx.user._id,
      )
      if (talk.fellowId !== fellow._id) {
        throw new Error("You can only update your own lightning talk")
      }
    }

    await ctx.db.patch("lightningTalks", args.talkId, {
      completed: args.completed,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const updated = await ctx.db.get("lightningTalks", args.talkId)
    if (!updated) {
      throw new Error("Lightning talk not found")
    }
    return updated
  },
})

export const getMyLightningTalk = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(talkValidator, v.null()),
  handler: async (ctx, args) => {
    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return null
    }

    return await ctx.db
      .query("lightningTalks")
      .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
      .unique()
  },
})
