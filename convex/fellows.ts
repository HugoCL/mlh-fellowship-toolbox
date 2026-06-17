import { v } from "convex/values"
import { requireFellowForUser } from "./lib/auth"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { ensureLeaderRecordsForFellow } from "./lib/leaderOneOnOnes"
import { fellowValidator } from "./lib/validators"

export const listFellows = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(fellowValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()
  },
})

export const addFellow = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.object({
    fellowId: v.id("fellows"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase()
    const trimmedName = args.name.trim()

    const existing = await ctx.db
      .query("fellows")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
      )
      .unique()

    if (existing) {
      throw new Error("Fellow with this email already exists in cohort")
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
      )
      .unique()

    if (existingInvite?.status === "pending") {
      throw new Error("An invitation is already pending for this email")
    }

    const fellowId = await ctx.db.insert("fellows", {
      cohortId: args.cohortId,
      name: trimmedName,
      email: normalizedEmail,
      createdAt: Date.now(),
    })

    await ensureLeaderRecordsForFellow(ctx, args.cohortId, fellowId)

    const token = crypto.randomUUID()
    await ctx.db.insert("invites", {
      cohortId: args.cohortId,
      email: normalizedEmail,
      role: "fellow",
      token,
      status: "pending",
      invitedByUserId: ctx.user._id,
      createdAt: Date.now(),
    })

    return { fellowId, token }
  },
})

export const updateFellow = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: fellowValidator,
  handler: async (ctx, args) => {
    const fellow = await ctx.db.get("fellows", args.fellowId)
    if (!fellow || fellow.cohortId !== args.cohortId) {
      throw new Error("Fellow not found")
    }

    const updates: {
      name?: string
      email?: string
    } = {}

    if (args.name !== undefined) {
      updates.name = args.name.trim()
    }
    if (args.email !== undefined) {
      updates.email = args.email.trim().toLowerCase()
    }

    await ctx.db.patch("fellows", args.fellowId, updates)
    const updated = await ctx.db.get("fellows", args.fellowId)
    if (!updated) {
      throw new Error("Fellow not found")
    }
    return updated
  },
})

export const updateMyCalendly = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    calendlyUrl: v.string(),
  },
  returns: fellowValidator,
  handler: async (ctx, args) => {
    const fellow = await requireFellowForUser(ctx, args.cohortId, ctx.user._id)
    await ctx.db.patch("fellows", fellow._id, { calendlyUrl: args.calendlyUrl })
    const updated = await ctx.db.get("fellows", fellow._id)
    if (!updated) {
      throw new Error("Fellow not found")
    }
    return updated
  },
})
