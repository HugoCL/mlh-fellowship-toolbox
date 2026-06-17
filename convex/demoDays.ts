import { v } from "convex/values"
import { getFellowForUser, requireFellowForUser } from "./lib/auth"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { getProgramWeeks } from "./lib/programWeeks"
import { fellowValidator } from "./lib/validators"

const demoDayValidator = v.object({
  _id: v.id("demoDays"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  demoDate: v.number(),
  completed: v.boolean(),
  updatedAt: v.number(),
  updatedByUserId: v.optional(v.id("users")),
})

export const listDemoDays = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellows: v.array(fellowValidator),
    demoDays: v.array(demoDayValidator),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const demoDays = await ctx.db
      .query("demoDays")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return {
      fellows,
      demoDays: demoDays.sort((a, b) => a.demoDate - b.demoDate),
    }
  },
})

export const assignDemoDay = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    demoDate: v.number(),
  },
  returns: demoDayValidator,
  handler: async (ctx, args) => {
    const fellow = await ctx.db.get("fellows", args.fellowId)
    if (!fellow || fellow.cohortId !== args.cohortId) {
      throw new Error("Fellow not found")
    }

    const existing = await ctx.db
      .query("demoDays")
      .withIndex("by_fellow", (q) => q.eq("fellowId", args.fellowId))
      .unique()

    if (existing) {
      await ctx.db.patch("demoDays", existing._id, {
        demoDate: args.demoDate,
        updatedAt: Date.now(),
        updatedByUserId: ctx.user._id,
      })
      const updated = await ctx.db.get("demoDays", existing._id)
      if (!updated) {
        throw new Error("Demo day not found")
      }
      return updated
    }

    const demoDayId = await ctx.db.insert("demoDays", {
      cohortId: args.cohortId,
      fellowId: args.fellowId,
      demoDate: args.demoDate,
      completed: false,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const created = await ctx.db.get("demoDays", demoDayId)
    if (!created) {
      throw new Error("Demo day not found")
    }
    return created
  },
})

export const generateAllDemoDays = podManagementMutation({
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
    if (programWeeks.length === 0) {
      throw new Error(
        "Set cohort start and end dates before generating demo days.",
      )
    }

    const fellows = (
      await ctx.db
        .query("fellows")
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
        .collect()
    ).sort((a, b) => a.name.localeCompare(b.name))

    const currentFellowIds = new Set(fellows.map((fellow) => fellow._id))

    const existingDemoDays = (
      await ctx.db
        .query("demoDays")
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
        .collect()
    ).filter((demoDay) => currentFellowIds.has(demoDay.fellowId))

    const assignedFellowIds = new Set(
      existingDemoDays.map((demoDay) => demoDay.fellowId),
    )
    const usedWeekStarts = new Set(
      existingDemoDays.map((demoDay) => demoDay.demoDate),
    )

    let created = 0
    let skipped = 0
    let weekIndex = 0
    const now = Date.now()

    for (const fellow of fellows) {
      if (assignedFellowIds.has(fellow._id)) {
        skipped += 1
        continue
      }

      let week = programWeeks[weekIndex % programWeeks.length]
      let guard = 0
      while (
        usedWeekStarts.has(week.weekStart) &&
        guard < programWeeks.length
      ) {
        weekIndex += 1
        week = programWeeks[weekIndex % programWeeks.length]
        guard += 1
      }

      if (usedWeekStarts.has(week.weekStart)) {
        if (fellows.length > programWeeks.length) {
          throw new Error(
            `This pod has ${fellows.length} fellows but only ${programWeeks.length} program weeks. Assign dates manually or adjust cohort dates.`,
          )
        }
        throw new Error(
          "All program weeks already have demo days assigned. Edit or remove existing dates first.",
        )
      }

      const demoDayId = await ctx.db.insert("demoDays", {
        cohortId: args.cohortId,
        fellowId: fellow._id,
        demoDate: week.weekStart,
        completed: false,
        updatedAt: now,
        updatedByUserId: ctx.user._id,
      })
      const inserted = await ctx.db.get("demoDays", demoDayId)
      if (inserted) {
        existingDemoDays.push(inserted)
      }
      usedWeekStarts.add(week.weekStart)
      assignedFellowIds.add(fellow._id)
      weekIndex += 1
      created += 1
    }

    return { created, skipped }
  },
})

export const removeDemoDay = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    demoDayId: v.id("demoDays"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const demoDay = await ctx.db.get("demoDays", args.demoDayId)
    if (!demoDay || demoDay.cohortId !== args.cohortId) {
      throw new Error("Demo day not found")
    }

    await ctx.db.delete("demoDays", args.demoDayId)
    return null
  },
})

export const updateDemoCompletion = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    demoDayId: v.id("demoDays"),
    completed: v.boolean(),
  },
  returns: demoDayValidator,
  handler: async (ctx, args) => {
    const demoDay = await ctx.db.get("demoDays", args.demoDayId)
    if (!demoDay || demoDay.cohortId !== args.cohortId) {
      throw new Error("Demo day not found")
    }

    if (ctx.membership.role === "fellow") {
      const fellow = await requireFellowForUser(
        ctx,
        args.cohortId,
        ctx.user._id,
      )
      if (demoDay.fellowId !== fellow._id) {
        throw new Error("You can only update your own demo day")
      }
    }

    await ctx.db.patch("demoDays", args.demoDayId, {
      completed: args.completed,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const updated = await ctx.db.get("demoDays", args.demoDayId)
    if (!updated) {
      throw new Error("Demo day not found")
    }
    return updated
  },
})

export const getMyDemoDay = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(demoDayValidator, v.null()),
  handler: async (ctx, args) => {
    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return null
    }

    return await ctx.db
      .query("demoDays")
      .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
      .unique()
  },
})
