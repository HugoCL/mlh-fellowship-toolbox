import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import {
  canManagePodAsLeader,
  isUmbrellaCohort,
  parentHasChildPods,
} from "./cohortScope"

type Ctx = QueryCtx | MutationCtx

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Not authenticated")
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique()

  if (!user) {
    throw new Error("User not found. Complete onboarding first.")
  }

  return user
}

export async function getOrCreateCurrentUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Not authenticated")
  }

  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique()

  if (existing) {
    return existing
  }

  const email = identity.email ?? "unknown@example.com"
  const name =
    identity.name ??
    identity.nickname ??
    email.split("@")[0] ??
    "Fellowship User"

  const userId = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    email,
    name,
    imageUrl: identity.pictureUrl,
    createdAt: Date.now(),
  })

  const user = await ctx.db.get("users", userId)
  if (!user) {
    throw new Error("Failed to create user")
  }

  return user
}

export async function getMembership(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"cohortMemberships"> | null> {
  return await ctx.db
    .query("cohortMemberships")
    .withIndex("by_cohort_and_user", (q) =>
      q.eq("cohortId", cohortId).eq("userId", userId),
    )
    .unique()
}

export async function requireMembership(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"cohortMemberships">> {
  const membership = await getMembership(ctx, cohortId, userId)
  if (!membership) {
    throw new Error("Not a member of this cohort")
  }
  return membership
}

export type CohortAccess =
  | {
      kind: "member"
      membership: Doc<"cohortMemberships">
      cohort: Doc<"cohorts">
    }
  | {
      kind: "umbrellaViewer"
      membership: Doc<"cohortMemberships">
      cohort: Doc<"cohorts">
      parentCohortId: Id<"cohorts">
    }

/** Direct membership, or cohort admin viewing a pod under their umbrella. */
export async function resolveCohortAccess(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<CohortAccess> {
  const cohort = await ctx.db.get("cohorts", cohortId)
  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const membership = await getMembership(ctx, cohortId, userId)
  if (membership) {
    return { kind: "member", membership, cohort }
  }

  if (cohort.parentCohortId) {
    const parentMembership = await getMembership(
      ctx,
      cohort.parentCohortId,
      userId,
    )
    if (parentMembership?.role === "podLeader") {
      return {
        kind: "umbrellaViewer",
        membership: parentMembership,
        cohort,
        parentCohortId: cohort.parentCohortId,
      }
    }
  }

  throw new Error("Not a member of this cohort")
}

/** Pod leader on a pod, or cohort admin viewing a pod — can manage directory invites. */
export async function requireDirectoryManagement(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<{
  cohortAccess: CohortAccess
  cohort: Doc<"cohorts">
}> {
  const cohortAccess = await resolveCohortAccess(ctx, cohortId, userId)
  const cohort = cohortAccess.cohort

  if (!cohort.parentCohortId) {
    throw new Error("Directory invites are only available inside a pod")
  }

  if (cohortAccess.kind === "umbrellaViewer") {
    return { cohortAccess, cohort }
  }

  if (
    cohortAccess.kind === "member" &&
    cohortAccess.membership.role === "podLeader"
  ) {
    return { cohortAccess, cohort }
  }

  throw new Error("Pod leader or cohort admin access required")
}

export async function requirePodLeader(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"cohortMemberships">> {
  const membership = await requireMembership(ctx, cohortId, userId)
  if (membership.role !== "podLeader") {
    throw new Error("Pod leader access required")
  }
  return membership
}

export async function requirePodManagementLeader(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<{
  membership: Doc<"cohortMemberships">
  cohort: Doc<"cohorts">
  hasChildPods: boolean
}> {
  const membership = await requirePodLeader(ctx, cohortId, userId)
  const cohort = await ctx.db.get("cohorts", cohortId)
  if (!cohort) {
    throw new Error("Cohort not found")
  }

  const hasChildPods = isUmbrellaCohort(cohort)
    ? await parentHasChildPods(ctx, cohortId)
    : false

  if (!canManagePodAsLeader(cohort, hasChildPods)) {
    throw new Error(
      "Pod leaders manage pods, not the umbrella cohort. Open your pod from the switcher or Cohort Settings.",
    )
  }

  return { membership, cohort, hasChildPods }
}

export async function requireUmbrellaLeader(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<{
  membership: Doc<"cohortMemberships">
  cohort: Doc<"cohorts">
}> {
  const membership = await requirePodLeader(ctx, cohortId, userId)
  const cohort = await ctx.db.get("cohorts", cohortId)
  if (!cohort) {
    throw new Error("Cohort not found")
  }

  if (!isUmbrellaCohort(cohort)) {
    throw new Error("This action is only available on the umbrella cohort.")
  }

  return { membership, cohort }
}

export async function getFellowForUser(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"fellows"> | null> {
  const fellows = await ctx.db
    .query("fellows")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  return fellows.find((fellow) => fellow.userId === userId) ?? null
}

export async function requireFellowForUser(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"fellows">> {
  const fellow = await getFellowForUser(ctx, cohortId, userId)
  if (!fellow) {
    throw new Error("Fellow profile not found for this cohort")
  }
  return fellow
}

export async function getMentorForUser(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"mentors"> | null> {
  const byUser = await ctx.db
    .query("mentors")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()

  return byUser.find((mentor) => mentor.cohortId === cohortId) ?? null
}

export async function requireMentorForUser(
  ctx: Ctx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<Doc<"mentors">> {
  const mentor = await getMentorForUser(ctx, cohortId, userId)
  if (!mentor) {
    throw new Error("Mentor profile not found for this cohort")
  }
  return mentor
}

export function canonicalPair(
  fellowAId: Id<"fellows">,
  fellowBId: Id<"fellows">,
): [Id<"fellows">, Id<"fellows">] {
  return fellowAId < fellowBId ? [fellowAId, fellowBId] : [fellowBId, fellowAId]
}
