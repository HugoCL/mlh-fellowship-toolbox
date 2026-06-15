import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getOrCreateCurrentUser } from "./lib/auth"
import { authedMutation, authedQuery } from "./lib/customFunctions"
import { userValidator } from "./lib/validators"

export const ensureCurrentUser = mutation({
  args: {},
  returns: userValidator,
  handler: async (ctx) => {
    return await getOrCreateCurrentUser(ctx)
  },
})

export const getCurrentUserProfile = authedQuery({
  args: {},
  returns: userValidator,
  handler: async (ctx) => {
    return ctx.user
  },
})

export const updateProfile = authedMutation({
  args: {
    name: v.optional(v.string()),
    calendlyUrl: v.optional(v.string()),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const updates: { name?: string; calendlyUrl?: string } = {}
    if (args.name !== undefined) {
      updates.name = args.name
    }
    if (args.calendlyUrl !== undefined) {
      updates.calendlyUrl = args.calendlyUrl.trim()
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch("users", ctx.user._id, updates)
    }
    const user = await ctx.db.get("users", ctx.user._id)
    if (!user) {
      throw new Error("User not found")
    }
    return user
  },
})

export const updateMySchedulingLink = authedMutation({
  args: {
    calendlyUrl: v.string(),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const trimmed = args.calendlyUrl.trim()
    if (!trimmed) {
      throw new Error("Enter a scheduling link.")
    }
    await ctx.db.patch("users", ctx.user._id, { calendlyUrl: trimmed })
    const user = await ctx.db.get("users", ctx.user._id)
    if (!user) {
      throw new Error("User not found")
    }
    return user
  },
})

export const getByToken = query({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique()
  },
})
