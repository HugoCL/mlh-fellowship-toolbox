import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { normalizeEmail } from "./lib/appAccess"
import { getCurrentUser, getOrCreateCurrentUser } from "./lib/auth"
import { umbrellaLeaderQuery } from "./lib/customFunctions"
import { acceptInviteForUser } from "./lib/inviteAcceptance"
import { cohortWorkspacePath } from "./lib/programCode"
import {
  cohortValidator,
  inviteStatusValidator,
  roleValidator,
} from "./lib/validators"

const invitePreviewValidator = v.object({
  _id: v.id("invites"),
  email: v.string(),
  role: roleValidator,
  status: inviteStatusValidator,
  cohort: cohortValidator,
  podProgramCode: v.union(v.string(), v.null()),
  emailMatchesUser: v.boolean(),
  userEmail: v.union(v.string(), v.null()),
})

export const getInviteByToken = query({
  args: { token: v.string() },
  returns: v.union(invitePreviewValidator, v.null()),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique()

    if (!invite) {
      return null
    }

    const cohort = await ctx.db.get("cohorts", invite.cohortId)
    if (!cohort) {
      return null
    }

    let podProgramCode: string | null = null
    if (invite.groupCohortId) {
      const pod = await ctx.db.get("cohorts", invite.groupCohortId)
      podProgramCode = pod?.programCode ?? null
    } else if (cohort.parentCohortId) {
      podProgramCode = cohort.programCode
    }

    const identity = await ctx.auth.getUserIdentity()
    let userEmail: string | null = null
    let emailMatchesUser = false

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique()
      if (user) {
        userEmail = user.email
      } else if (identity.email) {
        userEmail = normalizeEmail(identity.email)
      }

      if (userEmail) {
        emailMatchesUser = userEmail === normalizeEmail(invite.email)
      }
    }

    return {
      _id: invite._id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      cohort,
      podProgramCode,
      emailMatchesUser,
      userEmail,
    }
  },
})

export const acceptInviteByToken = mutation({
  args: { token: v.string() },
  returns: v.object({
    cohortId: v.id("cohorts"),
    role: roleValidator,
    redirectPath: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await getOrCreateCurrentUser(ctx, { inviteToken: args.token })

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique()

    if (!invite) {
      throw new Error("Invitation not found")
    }

    await acceptInviteForUser(ctx, invite, user)

    const cohort = await ctx.db.get("cohorts", invite.cohortId)
    if (!cohort) {
      throw new Error("Cohort not found")
    }

    let redirectCohortId = invite.cohortId
    if (invite.role === "podLeader" && invite.groupCohortId) {
      redirectCohortId = invite.groupCohortId
    } else if (invite.role === "podLeader" && cohort.parentCohortId) {
      redirectCohortId = invite.cohortId
    } else if (invite.role === "podLeader") {
      const updated = await ctx.db.get("invites", invite._id)
      if (updated?.groupCohortId) {
        redirectCohortId = updated.groupCohortId
      }
    }

    const redirectCohort = await ctx.db.get("cohorts", redirectCohortId)
    if (!redirectCohort) {
      throw new Error("Cohort not found")
    }

    const redirectPath =
      invite.role === "podLeader"
        ? `/dashboard?cohort=${encodeURIComponent(cohort.programCode)}`
        : `${cohortWorkspacePath(redirectCohort.programCode, "directory")}?setup=scheduling`

    return {
      cohortId: redirectCohortId,
      role: invite.role,
      redirectPath,
    }
  },
})

/** @deprecated Use acceptInviteByToken via /invite/[token] instead. */
export const acceptPendingInvites = mutation({
  args: {},
  returns: v.number(),
  handler: async () => {
    return 0
  },
})

export const listPendingForCohort = umbrellaLeaderQuery({
  args: {
    cohortId: v.id("cohorts"),
  },
  returns: v.array(
    v.object({
      _id: v.id("invites"),
      email: v.string(),
      role: roleValidator,
      status: inviteStatusValidator,
      createdAt: v.number(),
      groupCohortId: v.optional(v.id("cohorts")),
      podProgramCode: v.union(v.string(), v.null()),
      token: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const results = []
    for (const invite of invites.filter((item) => item.role === "podLeader")) {
      let podProgramCode: string | null = null
      if (invite.groupCohortId) {
        const pod = await ctx.db.get("cohorts", invite.groupCohortId)
        podProgramCode = pod?.programCode ?? null
      }

      results.push({
        _id: invite._id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        groupCohortId: invite.groupCohortId,
        podProgramCode,
        token: invite.token,
      })
    }

    return results.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const listPendingForPod = query({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(
    v.object({
      _id: v.id("invites"),
      email: v.string(),
      role: roleValidator,
      status: inviteStatusValidator,
      createdAt: v.number(),
      token: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx)

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return invites
      .filter((invite) => invite.status === "pending")
      .map((invite) => ({
        _id: invite._id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        token: invite.token,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})
