import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { getMembership } from "./auth"
import {
  assertPodUnderParent,
  assignPodLeader,
  createPodGroupForLeader,
  getPodLeaderMembership,
  userLeadsGroupUnderParent,
} from "./groups"

export async function acceptInviteForUser(
  ctx: MutationCtx,
  invite: Doc<"invites">,
  user: Doc<"users">,
): Promise<void> {
  if (invite.status !== "pending") {
    throw new Error("This invitation is no longer valid")
  }

  const normalizedEmail = user.email.trim().toLowerCase()
  if (invite.email.trim().toLowerCase() !== normalizedEmail) {
    throw new Error(
      "This invitation was sent to a different email address. Sign in with the invited email to accept.",
    )
  }

  if (invite.role === "podLeader") {
    await acceptPodLeaderInvite(ctx, invite, user._id)
    return
  }

  if (invite.role === "fellow") {
    await acceptFellowInvite(ctx, invite, user)
    return
  }

  if (invite.role === "mentor") {
    await acceptMentorInvite(ctx, invite, user)
    return
  }
}

async function acceptPodLeaderInvite(
  ctx: MutationCtx,
  invite: Doc<"invites">,
  userId: Id<"users">,
): Promise<void> {
  const parentCohort = await ctx.db.get("cohorts", invite.cohortId)
  if (!parentCohort) {
    throw new Error("Cohort not found")
  }

  if (parentCohort.parentCohortId) {
    throw new Error("Invalid pod leader invite target")
  }

  const alreadyLeadsGroup = await userLeadsGroupUnderParent(
    ctx,
    parentCohort._id,
    userId,
  )
  if (alreadyLeadsGroup) {
    await ctx.db.patch("invites", invite._id, { status: "accepted" })
    return
  }

  if (invite.groupCohortId) {
    await assertPodUnderParent(ctx, parentCohort._id, invite.groupCohortId)

    const existingLeader = await getPodLeaderMembership(
      ctx,
      invite.groupCohortId,
    )
    if (existingLeader) {
      await ctx.db.patch("invites", invite._id, { status: "accepted" })
      return
    }

    await assignPodLeader(ctx, invite.groupCohortId, userId)
    await ctx.db.patch("invites", invite._id, { status: "accepted" })
    return
  }

  const groupCohortId = await createPodGroupForLeader(ctx, parentCohort, userId)

  await ctx.db.patch("invites", invite._id, {
    status: "accepted",
    groupCohortId,
  })
}

async function acceptFellowInvite(
  ctx: MutationCtx,
  invite: Doc<"invites">,
  user: Doc<"users">,
): Promise<void> {
  const normalizedEmail = user.email.trim().toLowerCase()

  const existingMembership = await getMembership(ctx, invite.cohortId, user._id)
  if (!existingMembership) {
    await ctx.db.insert("cohortMemberships", {
      cohortId: invite.cohortId,
      userId: user._id,
      role: "fellow",
      joinedAt: Date.now(),
    })
  }

  const fellow = await ctx.db
    .query("fellows")
    .withIndex("by_cohort_and_email", (q) =>
      q.eq("cohortId", invite.cohortId).eq("email", normalizedEmail),
    )
    .unique()

  if (fellow && !fellow.userId) {
    await ctx.db.patch("fellows", fellow._id, { userId: user._id })
  } else if (!fellow) {
    await ctx.db.insert("fellows", {
      cohortId: invite.cohortId,
      userId: user._id,
      name: user.name,
      email: normalizedEmail,
      createdAt: Date.now(),
    })
  }

  await ctx.db.patch("invites", invite._id, { status: "accepted" })
}

async function acceptMentorInvite(
  ctx: MutationCtx,
  invite: Doc<"invites">,
  user: Doc<"users">,
): Promise<void> {
  const normalizedEmail = user.email.trim().toLowerCase()

  const existingMembership = await getMembership(ctx, invite.cohortId, user._id)
  if (!existingMembership) {
    await ctx.db.insert("cohortMemberships", {
      cohortId: invite.cohortId,
      userId: user._id,
      role: "mentor",
      joinedAt: Date.now(),
    })
  }

  const mentor = await ctx.db
    .query("mentors")
    .withIndex("by_cohort_and_email", (q) =>
      q.eq("cohortId", invite.cohortId).eq("email", normalizedEmail),
    )
    .unique()

  if (mentor && !mentor.userId) {
    await ctx.db.patch("mentors", mentor._id, { userId: user._id })
  } else if (!mentor) {
    await ctx.db.insert("mentors", {
      cohortId: invite.cohortId,
      userId: user._id,
      name: user.name,
      email: normalizedEmail,
      calendlyUrl: "",
      active: true,
      createdAt: Date.now(),
    })
  }

  await ctx.db.patch("invites", invite._id, { status: "accepted" })
}
