import { v } from "convex/values"
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions"
import { mutation, query } from "../_generated/server"
import {
  getCurrentUser,
  requireDirectoryManagement,
  requirePodLeader,
  requirePodManagementLeader,
  requireUmbrellaLeader,
  resolveCohortAccess,
} from "./auth"

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    return { ctx: { ...ctx, user }, args }
  },
})

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    return { ctx: { ...ctx, user }, args }
  },
})

export const cohortQuery = customQuery(query, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const cohortAccess = await resolveCohortAccess(ctx, args.cohortId, user._id)

    return {
      ctx: {
        ...ctx,
        user,
        membership: cohortAccess.membership,
        cohortAccess,
      },
      args,
    }
  },
})

export const cohortMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const membership = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort_and_user", (q) =>
        q.eq("cohortId", args.cohortId).eq("userId", user._id),
      )
      .unique()

    if (!membership) {
      throw new Error("Not a member of this cohort")
    }

    return {
      ctx: { ...ctx, user, membership },
      args,
    }
  },
})

export const leaderQuery = customQuery(query, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const membership = await requirePodLeader(ctx, args.cohortId, user._id)
    return {
      ctx: { ...ctx, user, membership },
      args,
    }
  },
})

export const leaderMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const membership = await requirePodLeader(ctx, args.cohortId, user._id)
    return {
      ctx: { ...ctx, user, membership },
      args,
    }
  },
})

/** Pod roster & activities — pod cohort, or umbrella before pods exist. */
export const podManagementQuery = customQuery(query, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const { membership, cohort, hasChildPods } =
      await requirePodManagementLeader(ctx, args.cohortId, user._id)
    return {
      ctx: { ...ctx, user, membership, cohort, hasChildPods },
      args,
    }
  },
})

export const podManagementMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const { membership, cohort, hasChildPods } =
      await requirePodManagementLeader(ctx, args.cohortId, user._id)
    return {
      ctx: { ...ctx, user, membership, cohort, hasChildPods },
      args,
    }
  },
})

/** Directory invites — pod leader on pod, or cohort admin viewing a pod. */
export const directoryManagementMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const { cohortAccess, cohort } = await requireDirectoryManagement(
      ctx,
      args.cohortId,
      user._id,
    )
    return {
      ctx: {
        ...ctx,
        user,
        membership: cohortAccess.membership,
        cohortAccess,
        cohort,
      },
      args,
    }
  },
})

/** Umbrella cohort admin — invites, pod list, cohort creation context. */
export const umbrellaLeaderQuery = customQuery(query, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const { membership, cohort } = await requireUmbrellaLeader(
      ctx,
      args.cohortId,
      user._id,
    )
    return {
      ctx: { ...ctx, user, membership, cohort },
      args,
    }
  },
})

export const umbrellaLeaderMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const { membership, cohort } = await requireUmbrellaLeader(
      ctx,
      args.cohortId,
      user._id,
    )
    return {
      ctx: { ...ctx, user, membership, cohort },
      args,
    }
  },
})
