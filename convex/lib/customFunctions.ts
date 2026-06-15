import { v } from "convex/values"
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions"
import { mutation, query } from "../_generated/server"
import {
  getCurrentUser,
  lookupCohortByProgramCode,
  requireDirectoryManagement,
  requirePodLeader,
  requirePodManagementLeader,
  requirePodSettingsManagement,
  requireUmbrellaLeader,
  resolveCohortAccess,
} from "./auth"
import {
  applyImpersonationToMembership,
  assertNotImpersonating,
} from "./impersonation"

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
    const { membership, impersonationSession } =
      await applyImpersonationToMembership(
        ctx,
        user._id,
        args.cohortId,
        cohortAccess.membership,
      )

    return {
      ctx: {
        ...ctx,
        user,
        membership,
        realMembership: cohortAccess.membership,
        impersonationSession,
        cohortAccess,
        cohortId: args.cohortId,
      },
      args,
    }
  },
})

export const cohortCodeQuery = customQuery(query, {
  args: { programCode: v.string() },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const cohort = await lookupCohortByProgramCode(ctx, args.programCode)
    const cohortAccess = await resolveCohortAccess(ctx, cohort._id, user._id)
    const { membership, impersonationSession } =
      await applyImpersonationToMembership(
        ctx,
        user._id,
        cohort._id,
        cohortAccess.membership,
      )

    return {
      ctx: {
        ...ctx,
        user,
        membership,
        realMembership: cohortAccess.membership,
        impersonationSession,
        cohortAccess,
        cohortId: cohort._id,
      },
      args,
    }
  },
})

export const cohortMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const cohortAccess = await resolveCohortAccess(ctx, args.cohortId, user._id)
    const { membership, impersonationSession } =
      await applyImpersonationToMembership(
        ctx,
        user._id,
        args.cohortId,
        cohortAccess.membership,
      )

    return {
      ctx: {
        ...ctx,
        user,
        membership,
        realMembership: cohortAccess.membership,
        impersonationSession,
      },
      args,
    }
  },
})

export const leaderQuery = customQuery(query, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await assertNotImpersonating(ctx, user._id)
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
    await assertNotImpersonating(ctx, user._id)
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
    await assertNotImpersonating(ctx, user._id)
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
    await assertNotImpersonating(ctx, user._id)
    const { membership, cohort, hasChildPods } =
      await requirePodManagementLeader(ctx, args.cohortId, user._id)
    return {
      ctx: { ...ctx, user, membership, cohort, hasChildPods },
      args,
    }
  },
})

/** Pod settings — pod leader on pod, or cohort admin editing a child pod. */
export const podSettingsMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await assertNotImpersonating(ctx, user._id)
    const { cohortAccess, cohort } = await requirePodSettingsManagement(
      ctx,
      args.cohortId,
      user._id,
    )
    return {
      ctx: {
        ...ctx,
        user,
        cohortAccess,
        cohort,
      },
      args,
    }
  },
})

/** Directory invites — pod leader on pod, or cohort admin viewing a pod. */
export const directoryManagementMutation = customMutation(mutation, {
  args: { cohortId: v.id("cohorts") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    await assertNotImpersonating(ctx, user._id)
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
    await assertNotImpersonating(ctx, user._id)
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
    await assertNotImpersonating(ctx, user._id)
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
