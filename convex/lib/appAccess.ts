import { NOT_INVITED_PREFIX, notInvitedMessageText } from "../../lib/app-access"
import type { Doc } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

export function isNotInvitedError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.startsWith(`${NOT_INVITED_PREFIX}:`)
  )
}

type Ctx = QueryCtx | MutationCtx

export function notInvitedError(): Error {
  return new Error(`${NOT_INVITED_PREFIX}: ${notInvitedMessageText()}`)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function hasPendingInviteForEmail(
  ctx: Ctx,
  email: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)
  const invites = await ctx.db
    .query("invites")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect()

  return invites.some((invite) => invite.status === "pending")
}

export async function hasCohortMembership(
  ctx: Ctx,
  userId: Doc<"users">["_id"],
): Promise<boolean> {
  const membership = await ctx.db
    .query("cohortMemberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first()

  return membership !== null
}

export function userHasAppAccess(user: Doc<"users">): boolean {
  return user.isPlatformAdmin === true
}

export async function assertExistingUserAppAccess(
  ctx: Ctx,
  user: Doc<"users">,
): Promise<void> {
  if (user.isPlatformAdmin === true) {
    return
  }

  if (await hasCohortMembership(ctx, user._id)) {
    return
  }

  if (await hasPendingInviteForEmail(ctx, user.email)) {
    return
  }

  throw notInvitedError()
}

export async function canBootstrapFirstUser(ctx: Ctx): Promise<boolean> {
  const existingUser = await ctx.db.query("users").first()
  return existingUser === null
}

export async function getInviteByToken(
  ctx: Ctx,
  token: string,
): Promise<Doc<"invites"> | null> {
  return await ctx.db
    .query("invites")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique()
}

export async function canCreateUserAccount(
  ctx: Ctx,
  email: string,
  inviteToken?: string,
): Promise<boolean> {
  if (await canBootstrapFirstUser(ctx)) {
    return true
  }

  if (await hasPendingInviteForEmail(ctx, email)) {
    return true
  }

  if (inviteToken) {
    const invite = await getInviteByToken(ctx, inviteToken)
    if (invite && invite.status === "pending") {
      return true
    }
  }

  return false
}

/** If no platform admin exists yet, promote the earliest user (existing deployments). */
export async function ensurePlatformBootstrapAdmin(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<Doc<"users">> {
  if (user.isPlatformAdmin === true) {
    return user
  }

  const allUsers = await ctx.db.query("users").collect()
  const hasAdmin = allUsers.some(
    (candidate) => candidate.isPlatformAdmin === true,
  )
  if (hasAdmin) {
    return user
  }

  const oldest = allUsers.sort((a, b) => a.createdAt - b.createdAt)[0]
  if (!oldest || oldest._id !== user._id) {
    return user
  }

  await ctx.db.patch("users", user._id, { isPlatformAdmin: true })
  const updated = await ctx.db.get("users", user._id)
  if (!updated) {
    throw new Error("User not found")
  }
  return updated
}
