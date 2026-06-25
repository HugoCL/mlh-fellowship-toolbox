import { v } from "convex/values"
import { mutation, type QueryCtx, query } from "./_generated/server"
import { getCurrentUser, requireDirectoryManagement } from "./lib/auth"
import {
  publicShareFeatureValidator,
  publicShareLinkValidator,
} from "./lib/validators"

const publicDirectoryPersonValidator = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.union(v.string(), v.null()),
  role: v.union(
    v.literal("podLeader"),
    v.literal("fellow"),
    v.literal("mentor"),
  ),
  calendlyUrl: v.union(v.string(), v.null()),
  discordUsername: v.union(v.string(), v.null()),
})

const publicDirectoryPayloadValidator = v.object({
  cohortProgramCode: v.string(),
  cohortName: v.string(),
  people: v.array(publicDirectoryPersonValidator),
})

const publicMentorSchedulePayloadValidator = v.object({
  cohortProgramCode: v.string(),
  cohortName: v.string(),
  rounds: v.array(
    v.object({
      _id: v.id("mentorMeetingRounds"),
      targetWeekLabel: v.string(),
      targetWeekStart: v.number(),
      roundNumber: v.number(),
    }),
  ),
  assignments: v.array(
    v.object({
      _id: v.id("mentorMeetingAssignments"),
      fellowName: v.string(),
      mentorName: v.string(),
      mentorCalendlyUrl: v.union(v.string(), v.null()),
      roundId: v.id("mentorMeetingRounds"),
    }),
  ),
})

export const getForFeature = query({
  args: {
    cohortId: v.id("cohorts"),
    feature: publicShareFeatureValidator,
  },
  returns: v.union(publicShareLinkValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await requireDirectoryManagement(ctx, args.cohortId, user._id)

    return await ctx.db
      .query("publicShareLinks")
      .withIndex("by_cohort_and_feature", (q) =>
        q.eq("cohortId", args.cohortId).eq("feature", args.feature),
      )
      .unique()
  },
})

export const createOrEnable = mutation({
  args: {
    cohortId: v.id("cohorts"),
    feature: publicShareFeatureValidator,
  },
  returns: publicShareLinkValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await requireDirectoryManagement(ctx, args.cohortId, user._id)

    const existing = await ctx.db
      .query("publicShareLinks")
      .withIndex("by_cohort_and_feature", (q) =>
        q.eq("cohortId", args.cohortId).eq("feature", args.feature),
      )
      .unique()

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        updatedByUserId: user._id,
        updatedAt: now,
      })
      const updated = await ctx.db.get(existing._id)
      if (!updated) throw new Error("Public share link not found")
      return updated
    }

    const shareId = await ctx.db.insert("publicShareLinks", {
      cohortId: args.cohortId,
      feature: args.feature,
      token: crypto.randomUUID(),
      enabled: true,
      createdByUserId: user._id,
      createdAt: now,
      updatedByUserId: user._id,
      updatedAt: now,
    })

    const created = await ctx.db.get(shareId)
    if (!created) throw new Error("Public share link not found")
    return created
  },
})

export const regenerate = mutation({
  args: {
    cohortId: v.id("cohorts"),
    feature: publicShareFeatureValidator,
  },
  returns: publicShareLinkValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await requireDirectoryManagement(ctx, args.cohortId, user._id)

    const existing = await ctx.db
      .query("publicShareLinks")
      .withIndex("by_cohort_and_feature", (q) =>
        q.eq("cohortId", args.cohortId).eq("feature", args.feature),
      )
      .unique()

    const now = Date.now()
    if (!existing) {
      const shareId = await ctx.db.insert("publicShareLinks", {
        cohortId: args.cohortId,
        feature: args.feature,
        token: crypto.randomUUID(),
        enabled: true,
        createdByUserId: user._id,
        createdAt: now,
        updatedByUserId: user._id,
        updatedAt: now,
      })
      const created = await ctx.db.get(shareId)
      if (!created) throw new Error("Public share link not found")
      return created
    }

    await ctx.db.patch(existing._id, {
      token: crypto.randomUUID(),
      enabled: true,
      updatedByUserId: user._id,
      updatedAt: now,
    })

    const updated = await ctx.db.get(existing._id)
    if (!updated) throw new Error("Public share link not found")
    return updated
  },
})

export const disable = mutation({
  args: {
    cohortId: v.id("cohorts"),
    feature: publicShareFeatureValidator,
  },
  returns: publicShareLinkValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await requireDirectoryManagement(ctx, args.cohortId, user._id)

    const existing = await ctx.db
      .query("publicShareLinks")
      .withIndex("by_cohort_and_feature", (q) =>
        q.eq("cohortId", args.cohortId).eq("feature", args.feature),
      )
      .unique()

    if (!existing) {
      throw new Error("Public share link not found")
    }

    await ctx.db.patch(existing._id, {
      enabled: false,
      updatedByUserId: user._id,
      updatedAt: Date.now(),
    })

    const updated = await ctx.db.get(existing._id)
    if (!updated) throw new Error("Public share link not found")
    return updated
  },
})

export const getDirectoryByToken = query({
  args: { token: v.string() },
  returns: v.union(publicDirectoryPayloadValidator, v.null()),
  handler: async (ctx, args) => {
    const share = await resolveEnabledShare(ctx, args.token, "directory")
    if (!share) return null

    const cohort = await ctx.db.get(share.cohortId)
    if (!cohort?.parentCohortId) return null

    const people: Array<{
      _id: string
      name: string
      email: string | null
      role: "podLeader" | "fellow" | "mentor"
      calendlyUrl: string | null
      discordUsername: string | null
    }> = []

    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()

    for (const membership of memberships) {
      if (membership.role !== "podLeader") continue
      const user = await ctx.db.get(membership.userId)
      if (!user) continue
      people.push({
        _id: membership._id,
        name: user.name,
        email: user.email,
        role: "podLeader",
        calendlyUrl: user.calendlyUrl?.trim() || null,
        discordUsername: user.discordUsername?.trim() || null,
      })
    }

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()

    for (const fellow of fellows) {
      const user = fellow.userId ? await ctx.db.get(fellow.userId) : null
      people.push({
        _id: fellow._id,
        name: fellow.name,
        email: fellow.email,
        role: "fellow",
        calendlyUrl: fellow.calendlyUrl?.trim() || null,
        discordUsername: user?.discordUsername?.trim() || null,
      })
    }

    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()

    for (const mentor of mentors) {
      const user = mentor.userId ? await ctx.db.get(mentor.userId) : null
      people.push({
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email ?? null,
        role: "mentor",
        calendlyUrl: mentor.calendlyUrl.trim() || null,
        discordUsername:
          mentor.discordUsername?.trim() ||
          user?.discordUsername?.trim() ||
          null,
      })
    }

    return {
      cohortProgramCode: cohort.programCode,
      cohortName: cohort.name,
      people,
    }
  },
})

export const getMentorScheduleByToken = query({
  args: { token: v.string() },
  returns: v.union(publicMentorSchedulePayloadValidator, v.null()),
  handler: async (ctx, args) => {
    const share = await resolveEnabledShare(ctx, args.token, "mentorMeetings")
    if (!share) return null

    const cohort = await ctx.db.get(share.cohortId)
    if (!cohort?.parentCohortId) return null

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()
    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()
    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()
    const assignments = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", share.cohortId))
      .collect()

    const fellowMap = new Map(fellows.map((fellow) => [fellow._id, fellow]))
    const mentorMap = new Map(mentors.map((mentor) => [mentor._id, mentor]))
    const roundMap = new Map(rounds.map((round) => [round._id, round]))

    return {
      cohortProgramCode: cohort.programCode,
      cohortName: cohort.name,
      rounds: rounds.sort((a, b) => a.roundNumber - b.roundNumber),
      assignments: assignments
        .filter(
          (assignment) =>
            fellowMap.has(assignment.fellowId) &&
            mentorMap.has(assignment.mentorId) &&
            roundMap.has(assignment.roundId),
        )
        .sort((a, b) => {
          const roundA = roundMap.get(a.roundId)
          const roundB = roundMap.get(b.roundId)
          const roundCompare =
            (roundA?.roundNumber ?? 0) - (roundB?.roundNumber ?? 0)
          if (roundCompare !== 0) return roundCompare
          const fellowA = fellowMap.get(a.fellowId)
          const fellowB = fellowMap.get(b.fellowId)
          return (fellowA?.name ?? "").localeCompare(fellowB?.name ?? "")
        })
        .map((assignment) => {
          const fellow = fellowMap.get(assignment.fellowId)!
          const mentor = mentorMap.get(assignment.mentorId)!
          return {
            _id: assignment._id,
            fellowName: fellow.name,
            mentorName: mentor.name,
            mentorCalendlyUrl: mentor.calendlyUrl.trim() || null,
            roundId: assignment.roundId,
          }
        }),
    }
  },
})

async function resolveEnabledShare(
  ctx: QueryCtx,
  token: string,
  feature: "directory" | "mentorMeetings",
) {
  const share = await ctx.db
    .query("publicShareLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique()

  if (!share?.enabled || share.feature !== feature) {
    return null
  }

  return share
}
