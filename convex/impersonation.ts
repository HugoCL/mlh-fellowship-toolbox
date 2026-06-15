import { v } from "convex/values"
import { resolveCohortAccess } from "./lib/auth"
import { authedMutation, authedQuery, cohortQuery } from "./lib/customFunctions"
import {
  assertCanImpersonateFellow,
  getActiveImpersonationSession,
} from "./lib/impersonation"
import { cohortValidator, fellowValidator } from "./lib/validators"

const impersonationStateValidator = v.union(
  v.object({
    fellow: fellowValidator,
    cohort: cohortValidator,
    startedAt: v.number(),
  }),
  v.null(),
)

export const getActiveImpersonation = authedQuery({
  args: {},
  returns: impersonationStateValidator,
  handler: async (ctx) => {
    const session = await getActiveImpersonationSession(ctx, ctx.user._id)
    if (!session) {
      return null
    }

    const fellow = await ctx.db.get("fellows", session.fellowId)
    const cohort = await ctx.db.get("cohorts", session.cohortId)
    if (!fellow || !cohort) {
      return null
    }

    return {
      fellow,
      cohort,
      startedAt: session.startedAt,
    }
  },
})

export const listImpersonationTargets = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(fellowValidator),
  handler: async (ctx, args) => {
    const cohortAccess = ctx.cohortAccess
    const canImpersonate =
      cohortAccess.membership.role === "podLeader" &&
      (cohortAccess.kind === "member" || cohortAccess.kind === "umbrellaViewer")

    if (!canImpersonate) {
      return []
    }

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return fellows.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const startImpersonation = authedMutation({
  args: { fellowId: v.id("fellows") },
  returns: v.object({
    fellowId: v.id("fellows"),
    cohortId: v.id("cohorts"),
    programCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const { fellow, cohortId } = await assertCanImpersonateFellow(
      ctx,
      ctx.user._id,
      args.fellowId,
    )

    const cohort = await ctx.db.get("cohorts", cohortId)
    if (!cohort) {
      throw new Error("Cohort not found")
    }

    const existing = await getActiveImpersonationSession(ctx, ctx.user._id)
    if (existing) {
      await ctx.db.delete("impersonationSessions", existing._id)
    }

    await ctx.db.insert("impersonationSessions", {
      actorUserId: ctx.user._id,
      fellowId: fellow._id,
      cohortId,
      startedAt: Date.now(),
    })

    return {
      fellowId: fellow._id,
      cohortId,
      programCode: cohort.programCode,
    }
  },
})

export const stopImpersonation = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const session = await getActiveImpersonationSession(ctx, ctx.user._id)
    if (session) {
      await ctx.db.delete("impersonationSessions", session._id)
    }
    return null
  },
})

export const canImpersonateInCohort = authedQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      const cohortAccess = await resolveCohortAccess(
        ctx,
        args.cohortId,
        ctx.user._id,
      )
      return (
        cohortAccess.membership.role === "podLeader" &&
        (cohortAccess.kind === "member" ||
          cohortAccess.kind === "umbrellaViewer")
      )
    } catch {
      return false
    }
  },
})
