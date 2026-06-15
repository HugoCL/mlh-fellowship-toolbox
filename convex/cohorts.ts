import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import {
  assertProgramCodeAvailable,
  type CohortAccess,
  getFellowForUser,
  getMentorForUser,
} from "./lib/auth"
import {
  canManagePodAsLeader,
  isUmbrellaCohort,
  parentHasChildPods,
} from "./lib/cohortScope"
import { applyCohortSettingsUpdate } from "./lib/cohortSettings"
import {
  authedMutation,
  authedQuery,
  cohortCodeQuery,
  cohortQuery,
  podSettingsMutation,
  umbrellaLeaderMutation,
  umbrellaLeaderQuery,
} from "./lib/customFunctions"
import {
  assertPodUnderParent,
  createEmptyPodGroup,
  getPendingInviteForPod,
  getPodLeaderMembership,
  userLeadsGroupUnderParent,
} from "./lib/groups"
import { baseProgramCode } from "./lib/programCode"
import {
  cohortStatusValidator,
  cohortValidator,
  fellowValidator,
  membershipValidator,
  mentorValidator,
  roleValidator,
} from "./lib/validators"

const cohortWithRoleValidator = v.object({
  cohort: cohortValidator,
  role: roleValidator,
})

const cohortDetailsValidator = v.object({
  cohort: cohortValidator,
  role: roleValidator,
  realRole: roleValidator,
  fellow: v.union(fellowValidator, v.null()),
  mentor: v.union(mentorValidator, v.null()),
  hasChildPods: v.boolean(),
  canManagePod: v.boolean(),
  isUmbrellaViewer: v.boolean(),
  parentProgramCode: v.union(v.string(), v.null()),
  impersonation: v.union(
    v.object({
      fellow: fellowValidator,
      startedAt: v.number(),
    }),
    v.null(),
  ),
})

type CohortDetailsCtx = QueryCtx & {
  user: { _id: Id<"users"> }
  membership: { role: "podLeader" | "fellow" | "mentor" }
  realMembership?: { role: "podLeader" | "fellow" | "mentor" }
  impersonationSession?: {
    fellowId: Id<"fellows">
    startedAt: number
  } | null
  cohortAccess: CohortAccess
}

async function buildCohortDetails(
  ctx: CohortDetailsCtx,
  cohortId: Id<"cohorts">,
) {
  const cohort = ctx.cohortAccess.cohort
  const isUmbrellaViewer = ctx.cohortAccess.kind === "umbrellaViewer"

  const fellow = await getFellowForUser(ctx, cohortId, ctx.user._id)
  const mentor = await getMentorForUser(ctx, cohortId, ctx.user._id)
  const hasChildPods = isUmbrellaCohort(cohort)
    ? await parentHasChildPods(ctx, cohortId)
    : false
  const canManagePod =
    ctx.membership.role === "podLeader" &&
    canManagePodAsLeader(cohort, hasChildPods) &&
    !isUmbrellaViewer

  let parentProgramCode: string | null = null
  if (cohort.parentCohortId) {
    const parent = await ctx.db.get("cohorts", cohort.parentCohortId)
    parentProgramCode = parent?.programCode ?? null
  }

  let impersonation: {
    fellow: NonNullable<Awaited<ReturnType<typeof getFellowForUser>>>
    startedAt: number
  } | null = null

  if (ctx.impersonationSession) {
    const impersonatedFellow = await ctx.db.get(
      "fellows",
      ctx.impersonationSession.fellowId,
    )
    if (impersonatedFellow) {
      impersonation = {
        fellow: impersonatedFellow,
        startedAt: ctx.impersonationSession.startedAt,
      }
    }
  }

  return {
    cohort,
    role: ctx.membership.role,
    realRole: ctx.realMembership?.role ?? ctx.membership.role,
    fellow,
    mentor,
    hasChildPods,
    canManagePod,
    isUmbrellaViewer,
    parentProgramCode,
    impersonation,
  }
}

export const listMyCohorts = authedQuery({
  args: {},
  returns: v.array(cohortWithRoleValidator),
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect()

    const results = []
    for (const membership of memberships) {
      const cohort = await ctx.db.get("cohorts", membership.cohortId)
      if (cohort) {
        results.push({ cohort, role: membership.role })
      }
    }

    return results.sort((a, b) => b.cohort.startDate - a.cohort.startDate)
  },
})

export const getCohort = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: cohortDetailsValidator,
  handler: async (ctx, args) => {
    return await buildCohortDetails(ctx, args.cohortId)
  },
})

export const getCohortByProgramCode = cohortCodeQuery({
  args: { programCode: v.string() },
  returns: cohortDetailsValidator,
  handler: async (ctx) => {
    return await buildCohortDetails(ctx, ctx.cohortId)
  },
})

export const createCohort = authedMutation({
  args: {
    name: v.string(),
    programCode: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    cohortId: v.id("cohorts"),
    programCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect()

    let hasUmbrellaLeadership = false
    for (const membership of memberships) {
      if (membership.role !== "podLeader") {
        continue
      }
      const cohort = await ctx.db.get("cohorts", membership.cohortId)
      if (cohort && isUmbrellaCohort(cohort)) {
        hasUmbrellaLeadership = true
        break
      }
    }

    if (memberships.length > 0 && !hasUmbrellaLeadership) {
      throw new Error(
        "Only umbrella cohort administrators can create new cohorts.",
      )
    }

    const normalizedProgramCode = baseProgramCode(args.programCode.trim())
    await assertProgramCodeAvailable(ctx, normalizedProgramCode)

    const cohortId = await ctx.db.insert("cohorts", {
      name: args.name,
      programCode: normalizedProgramCode,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "active",
      createdByUserId: ctx.user._id,
      createdAt: Date.now(),
    })

    await ctx.db.insert("cohortMemberships", {
      cohortId,
      userId: ctx.user._id,
      role: "podLeader",
      joinedAt: Date.now(),
    })

    await ctx.db.insert("oneOnOneInstances", {
      cohortId,
      title: "Start of the program",
      sortOrder: 0,
      createdAt: Date.now(),
    })

    await ctx.db.insert("oneOnOneInstances", {
      cohortId,
      title: "End of the program",
      sortOrder: 1,
      createdAt: Date.now(),
    })

    return { cohortId, programCode: normalizedProgramCode }
  },
})

export const listMembers = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(
    v.object({
      membership: membershipValidator,
      user: v.object({
        _id: v.id("users"),
        name: v.string(),
        email: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const results = []
    for (const membership of memberships) {
      const user = await ctx.db.get("users", membership.userId)
      if (user) {
        results.push({
          membership,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
          },
        })
      }
    }

    return results
  },
})

export const updateUmbrellaCohort = umbrellaLeaderMutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(cohortStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await applyCohortSettingsUpdate(ctx, ctx.cohort, {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      status: args.status,
    })
    return null
  },
})

export const updatePod = podSettingsMutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await applyCohortSettingsUpdate(ctx, ctx.cohort, {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
    })
    return null
  },
})

export const createPod = umbrellaLeaderMutation({
  args: { cohortId: v.id("cohorts") },
  returns: v.id("cohorts"),
  handler: async (ctx, _args) => {
    return await createEmptyPodGroup(ctx, ctx.cohort, ctx.user._id)
  },
})

export const addPodLeaderByEmail = umbrellaLeaderMutation({
  args: {
    cohortId: v.id("cohorts"),
    email: v.string(),
    podCohortId: v.id("cohorts"),
  },
  returns: v.object({
    inviteId: v.id("invites"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertPodUnderParent(ctx, args.cohortId, args.podCohortId)

    const leaderMembership = await getPodLeaderMembership(ctx, args.podCohortId)
    if (leaderMembership) {
      throw new Error("This pod already has a pod leader assigned")
    }

    const pendingForPod = await getPendingInviteForPod(
      ctx,
      args.cohortId,
      args.podCohortId,
    )
    if (pendingForPod) {
      throw new Error("A pod leader invite is already pending for this pod")
    }

    const normalizedEmail = args.email.trim().toLowerCase()
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique()

    if (existingUser) {
      const parentMembership = await ctx.db
        .query("cohortMemberships")
        .withIndex("by_cohort_and_user", (q) =>
          q.eq("cohortId", args.cohortId).eq("userId", existingUser._id),
        )
        .unique()

      if (parentMembership?.role === "podLeader") {
        throw new Error("User is already a cohort administrator")
      }

      const alreadyLeadsGroup = await userLeadsGroupUnderParent(
        ctx,
        args.cohortId,
        existingUser._id,
      )
      if (alreadyLeadsGroup) {
        throw new Error("User already leads a pod in this cohort")
      }
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
      )
      .unique()

    if (
      existingInvite &&
      existingInvite.role === "podLeader" &&
      existingInvite.status === "pending"
    ) {
      throw new Error("A pod leader invite is already pending for this email")
    }

    const token = crypto.randomUUID()
    const inviteId = await ctx.db.insert("invites", {
      cohortId: args.cohortId,
      email: normalizedEmail,
      role: "podLeader",
      token,
      status: "pending",
      invitedByUserId: ctx.user._id,
      createdAt: Date.now(),
      groupCohortId: args.podCohortId,
    })

    return { inviteId, token }
  },
})

const groupWithLeaderValidator = v.object({
  cohort: cohortValidator,
  leader: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
    v.null(),
  ),
  pendingLeaderEmail: v.union(v.string(), v.null()),
  fellowCount: v.number(),
})

export const listGroupsForParent = umbrellaLeaderQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(groupWithLeaderValidator),
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("cohorts")
      .withIndex("by_parent", (q) => q.eq("parentCohortId", args.cohortId))
      .collect()

    const results = []
    for (const group of groups.sort(
      (a, b) => (a.groupNumber ?? 0) - (b.groupNumber ?? 0),
    )) {
      const memberships = await ctx.db
        .query("cohortMemberships")
        .withIndex("by_cohort", (q) => q.eq("cohortId", group._id))
        .collect()

      const leaderMembership = memberships.find(
        (membership) => membership.role === "podLeader",
      )

      let leader: {
        _id: typeof ctx.user._id
        name: string
        email: string
      } | null = null

      if (leaderMembership) {
        const user = await ctx.db.get("users", leaderMembership.userId)
        if (user) {
          leader = {
            _id: user._id,
            name: user.name,
            email: user.email,
          }
        }
      }

      const fellows = await ctx.db
        .query("fellows")
        .withIndex("by_cohort", (q) => q.eq("cohortId", group._id))
        .collect()

      const pendingInvite = await getPendingInviteForPod(
        ctx,
        args.cohortId,
        group._id,
      )

      results.push({
        cohort: group,
        leader,
        pendingLeaderEmail: pendingInvite?.email ?? null,
        fellowCount: fellows.length,
      })
    }

    return results
  },
})

export const getDashboardSummary = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellowCount: v.number(),
    peerCompleted: v.number(),
    peerTotal: v.number(),
    leaderCompleted: v.number(),
    leaderTotal: v.number(),
    mentorCompleted: v.number(),
    mentorTotal: v.number(),
    demoCompleted: v.number(),
    demoTotal: v.number(),
    lightningCompleted: v.number(),
    lightningTotal: v.number(),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const peerOneOnOnes = await ctx.db
      .query("peerOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const leaderOneOnOnes = await ctx.db
      .query("leaderOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const mentorAssignments = await ctx.db
      .query("mentorMeetingAssignments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const demoDays = await ctx.db
      .query("demoDays")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const lightningTalks = await ctx.db
      .query("lightningTalks")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return {
      fellowCount: fellows.length,
      peerCompleted: peerOneOnOnes.filter((item) => item.status === "completed")
        .length,
      peerTotal: peerOneOnOnes.length,
      leaderCompleted: leaderOneOnOnes.filter(
        (item) => item.status === "completed",
      ).length,
      leaderTotal: leaderOneOnOnes.length,
      mentorCompleted: mentorAssignments.filter((item) => item.completed)
        .length,
      mentorTotal: mentorAssignments.length,
      demoCompleted: demoDays.filter((item) => item.completed).length,
      demoTotal: demoDays.length,
      lightningCompleted: lightningTalks.filter((item) => item.completed)
        .length,
      lightningTotal: lightningTalks.length,
    }
  },
})
