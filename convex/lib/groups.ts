import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { buildGroupProgramCode } from "./programCode"

export async function getNextGroupNumber(
  ctx: MutationCtx,
  parentCohortId: Id<"cohorts">,
): Promise<number> {
  const existingGroups = await ctx.db
    .query("cohorts")
    .withIndex("by_parent", (q) => q.eq("parentCohortId", parentCohortId))
    .collect()

  if (existingGroups.length === 0) {
    return 1
  }

  const maxNumber = Math.max(
    ...existingGroups.map((group) => group.groupNumber ?? 0),
  )
  return maxNumber + 1
}

async function seedPodOneOnOneInstances(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
): Promise<void> {
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
}

export async function createEmptyPodGroup(
  ctx: MutationCtx,
  parentCohort: Doc<"cohorts">,
  createdByUserId: Id<"users">,
): Promise<Id<"cohorts">> {
  if (parentCohort.parentCohortId) {
    throw new Error("Pods can only be created under an umbrella cohort")
  }

  const groupNumber = await getNextGroupNumber(ctx, parentCohort._id)
  const programCode = buildGroupProgramCode(
    parentCohort.programCode,
    groupNumber,
  )

  const groupId = await ctx.db.insert("cohorts", {
    name: `${parentCohort.name} · Pod ${groupNumber}`,
    programCode,
    startDate: parentCohort.startDate,
    endDate: parentCohort.endDate,
    status: parentCohort.status,
    createdByUserId,
    createdAt: Date.now(),
    parentCohortId: parentCohort._id,
    groupNumber,
  })

  await seedPodOneOnOneInstances(ctx, groupId)

  return groupId
}

export async function assignPodLeader(
  ctx: MutationCtx,
  podCohortId: Id<"cohorts">,
  podLeaderUserId: Id<"users">,
): Promise<void> {
  const pod = await ctx.db.get("cohorts", podCohortId)
  if (!pod?.parentCohortId) {
    throw new Error("Pod not found")
  }

  const existingLeader = await getPodLeaderMembership(ctx, podCohortId)
  if (existingLeader) {
    throw new Error("This pod already has a pod leader assigned")
  }

  const existingMembership = await ctx.db
    .query("cohortMemberships")
    .withIndex("by_cohort_and_user", (q) =>
      q.eq("cohortId", podCohortId).eq("userId", podLeaderUserId),
    )
    .unique()

  if (existingMembership) {
    throw new Error("User is already a member of this pod")
  }

  await ctx.db.insert("cohortMemberships", {
    cohortId: podCohortId,
    userId: podLeaderUserId,
    role: "podLeader",
    joinedAt: Date.now(),
  })
}

export async function createPodGroupForLeader(
  ctx: MutationCtx,
  parentCohort: Doc<"cohorts">,
  podLeaderUserId: Id<"users">,
): Promise<Id<"cohorts">> {
  const groupId = await createEmptyPodGroup(ctx, parentCohort, podLeaderUserId)
  await assignPodLeader(ctx, groupId, podLeaderUserId)
  return groupId
}

export async function getPodLeaderMembership(
  ctx: QueryCtx | MutationCtx,
  podCohortId: Id<"cohorts">,
): Promise<Doc<"cohortMemberships"> | null> {
  const memberships = await ctx.db
    .query("cohortMemberships")
    .withIndex("by_cohort", (q) => q.eq("cohortId", podCohortId))
    .collect()

  return (
    memberships.find((membership) => membership.role === "podLeader") ?? null
  )
}

export async function getPendingInviteForPod(
  ctx: QueryCtx | MutationCtx,
  parentCohortId: Id<"cohorts">,
  podCohortId: Id<"cohorts">,
): Promise<Doc<"invites"> | null> {
  const invites = await ctx.db
    .query("invites")
    .withIndex("by_cohort", (q) => q.eq("cohortId", parentCohortId))
    .collect()

  return (
    invites.find(
      (invite) =>
        invite.groupCohortId === podCohortId && invite.status === "pending",
    ) ?? null
  )
}

export async function assertPodUnderParent(
  ctx: QueryCtx | MutationCtx,
  parentCohortId: Id<"cohorts">,
  podCohortId: Id<"cohorts">,
): Promise<Doc<"cohorts">> {
  const pod = await ctx.db.get("cohorts", podCohortId)
  if (!pod || pod.parentCohortId !== parentCohortId) {
    throw new Error("Pod not found in this cohort")
  }
  return pod
}

export async function userLeadsGroupUnderParent(
  ctx: MutationCtx,
  parentCohortId: Id<"cohorts">,
  userId: Id<"users">,
): Promise<boolean> {
  const groups = await ctx.db
    .query("cohorts")
    .withIndex("by_parent", (q) => q.eq("parentCohortId", parentCohortId))
    .collect()

  for (const group of groups) {
    const membership = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort_and_user", (q) =>
        q.eq("cohortId", group._id).eq("userId", userId),
      )
      .unique()

    if (membership?.role === "podLeader") {
      return true
    }
  }

  return false
}
