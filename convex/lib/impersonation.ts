import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { resolveCohortAccess } from "./auth"

type Ctx = QueryCtx | MutationCtx

export async function getActiveImpersonationSession(
  ctx: Ctx,
  actorUserId: Id<"users">,
): Promise<Doc<"impersonationSessions"> | null> {
  return await ctx.db
    .query("impersonationSessions")
    .withIndex("by_actor", (q) => q.eq("actorUserId", actorUserId))
    .unique()
}

async function isImpersonationSessionValid(
  ctx: Ctx,
  session: Doc<"impersonationSessions">,
): Promise<boolean> {
  const fellow = await ctx.db.get("fellows", session.fellowId)
  const cohort = await ctx.db.get("cohorts", session.cohortId)
  return fellow !== null && cohort !== null
}

/** Session whose fellow and cohort still exist; null if missing or stale. */
export async function getValidImpersonationSession(
  ctx: Ctx,
  actorUserId: Id<"users">,
): Promise<Doc<"impersonationSessions"> | null> {
  const session = await getActiveImpersonationSession(ctx, actorUserId)
  if (!session) {
    return null
  }
  if (await isImpersonationSessionValid(ctx, session)) {
    return session
  }
  return null
}

/** Remove orphaned sessions (e.g. fellow or cohort deleted). Mutation-only. */
export async function deleteStaleImpersonationSession(
  ctx: MutationCtx,
  actorUserId: Id<"users">,
): Promise<boolean> {
  const session = await getActiveImpersonationSession(ctx, actorUserId)
  if (!session) {
    return false
  }
  if (await isImpersonationSessionValid(ctx, session)) {
    return false
  }
  await ctx.db.delete("impersonationSessions", session._id)
  return true
}

export async function assertCanImpersonateFellow(
  ctx: MutationCtx,
  actorUserId: Id<"users">,
  fellowId: Id<"fellows">,
): Promise<{ fellow: Doc<"fellows">; cohortId: Id<"cohorts"> }> {
  const fellow = await ctx.db.get("fellows", fellowId)
  if (!fellow) {
    throw new Error("Fellow not found")
  }

  const cohortAccess = await resolveCohortAccess(
    ctx,
    fellow.cohortId,
    actorUserId,
  )

  const canImpersonate =
    cohortAccess.membership.role === "podLeader" &&
    (cohortAccess.kind === "member" || cohortAccess.kind === "umbrellaViewer")

  if (!canImpersonate) {
    throw new Error("You do not have permission to impersonate this fellow")
  }

  return { fellow, cohortId: fellow.cohortId }
}

export async function applyImpersonationToMembership(
  ctx: Ctx,
  userId: Id<"users">,
  cohortId: Id<"cohorts">,
  membership: Doc<"cohortMemberships">,
): Promise<{
  membership: Doc<"cohortMemberships">
  impersonationSession: Doc<"impersonationSessions"> | null
}> {
  const session = await getValidImpersonationSession(ctx, userId)
  if (session && session.cohortId === cohortId) {
    return {
      membership: { ...membership, role: "fellow" },
      impersonationSession: session,
    }
  }
  return { membership, impersonationSession: session }
}

export async function assertNotImpersonating(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<void> {
  const session = await getValidImpersonationSession(ctx, userId)
  if (session) {
    throw new Error("Stop impersonation to perform this action")
  }
}
