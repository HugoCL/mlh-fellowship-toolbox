import { v } from "convex/values"
import { cohortQuery, directoryManagementMutation } from "./lib/customFunctions"
import { ensureLeaderRecordsForFellow } from "./lib/leaderOneOnOnes"
import {
  directoryInviteRoleValidator,
  inviteStatusValidator,
  roleValidator,
} from "./lib/validators"

const directoryPersonValidator = v.object({
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
  imageUrl: v.union(v.string(), v.null()),
  joined: v.boolean(),
  pendingInvite: v.boolean(),
})

const pendingDirectoryInviteValidator = v.object({
  _id: v.id("invites"),
  email: v.string(),
  role: directoryInviteRoleValidator,
  status: inviteStatusValidator,
  createdAt: v.number(),
  token: v.string(),
})

export const getDirectory = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    people: v.array(directoryPersonValidator),
    pendingInvites: v.array(pendingDirectoryInviteValidator),
    canInvite: v.boolean(),
    currentRole: roleValidator,
    cohortProgramCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const cohort = ctx.cohortAccess.cohort
    const isUmbrellaViewer = ctx.cohortAccess.kind === "umbrellaViewer"
    const isPod = Boolean(cohort.parentCohortId)
    const canInvite =
      !ctx.impersonationSession &&
      isPod &&
      (isUmbrellaViewer ||
        (ctx.cohortAccess.kind === "member" &&
          ctx.membership.role === "podLeader"))

    const people: Array<{
      _id: string
      name: string
      email: string | null
      role: "podLeader" | "fellow" | "mentor"
      calendlyUrl: string | null
      discordUsername: string | null
      imageUrl: string | null
      joined: boolean
      pendingInvite: boolean
    }> = []

    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const membership of memberships) {
      if (membership.role !== "podLeader") {
        continue
      }
      const user = await ctx.db.get("users", membership.userId)
      if (user) {
        people.push({
          _id: membership._id,
          name: user.name,
          email: user.email,
          role: "podLeader",
          calendlyUrl: user.calendlyUrl?.trim() || null,
          discordUsername: user.discordUsername?.trim() || null,
          imageUrl: user.imageUrl ?? null,
          joined: true,
          pendingInvite: false,
        })
      }
    }

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const fellow of fellows) {
      const fellowUser = fellow.userId
        ? await ctx.db.get("users", fellow.userId)
        : null
      people.push({
        _id: fellow._id,
        name: fellow.name,
        email: fellow.email,
        role: "fellow",
        calendlyUrl: fellow.calendlyUrl?.trim() || null,
        discordUsername: fellowUser?.discordUsername?.trim() || null,
        imageUrl: fellowUser?.imageUrl ?? null,
        joined: Boolean(fellow.userId),
        pendingInvite: !fellow.userId,
      })
    }

    const mentors = await ctx.db
      .query("mentors")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const mentor of mentors) {
      const mentorUser = mentor.userId
        ? await ctx.db.get("users", mentor.userId)
        : null
      people.push({
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email ?? null,
        role: "mentor",
        calendlyUrl: mentor.calendlyUrl.trim() || null,
        discordUsername: mentorUser?.discordUsername?.trim() || null,
        imageUrl: mentorUser?.imageUrl ?? null,
        joined: Boolean(mentor.userId),
        pendingInvite: !mentor.userId && Boolean(mentor.email),
      })
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const pendingInvites = invites
      .filter(
        (invite) =>
          invite.status === "pending" &&
          (invite.role === "fellow" || invite.role === "mentor"),
      )
      .map((invite) => ({
        _id: invite._id,
        email: invite.email,
        role: invite.role as "fellow" | "mentor",
        status: invite.status,
        createdAt: invite.createdAt,
        token: invite.token,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    return {
      people,
      pendingInvites,
      canInvite,
      currentRole: ctx.membership.role,
      cohortProgramCode: cohort.programCode,
    }
  },
})

export const inviteDirectoryMember = directoryManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    role: directoryInviteRoleValidator,
    name: v.string(),
    email: v.string(),
  },
  returns: v.object({
    inviteId: v.id("invites"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase()
    const trimmedName = args.name.trim()

    if (!trimmedName) {
      throw new Error("Name is required")
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_cohort_and_email", (q) =>
        q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
      )
      .unique()

    if (existingInvite?.status === "pending") {
      throw new Error("An invitation is already pending for this email")
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique()

    if (existingUser) {
      const membership = await ctx.db
        .query("cohortMemberships")
        .withIndex("by_cohort_and_user", (q) =>
          q.eq("cohortId", args.cohortId).eq("userId", existingUser._id),
        )
        .unique()

      if (membership) {
        throw new Error("This person is already a member of this pod")
      }
    }

    if (args.role === "fellow") {
      const existingFellow = await ctx.db
        .query("fellows")
        .withIndex("by_cohort_and_email", (q) =>
          q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
        )
        .unique()

      if (existingFellow) {
        throw new Error("A fellow with this email already exists in this pod")
      }

      const fellowId = await ctx.db.insert("fellows", {
        cohortId: args.cohortId,
        name: trimmedName,
        email: normalizedEmail,
        createdAt: Date.now(),
      })

      await ensureLeaderRecordsForFellow(ctx, args.cohortId, fellowId)
    } else {
      const existingMentor = await ctx.db
        .query("mentors")
        .withIndex("by_cohort_and_email", (q) =>
          q.eq("cohortId", args.cohortId).eq("email", normalizedEmail),
        )
        .unique()

      if (existingMentor) {
        throw new Error("A mentor with this email already exists in this pod")
      }

      await ctx.db.insert("mentors", {
        cohortId: args.cohortId,
        name: trimmedName,
        email: normalizedEmail,
        calendlyUrl: "",
        active: true,
        createdAt: Date.now(),
      })
    }

    const token = crypto.randomUUID()
    const inviteId = await ctx.db.insert("invites", {
      cohortId: args.cohortId,
      email: normalizedEmail,
      role: args.role,
      token,
      status: "pending",
      invitedByUserId: ctx.user._id,
      createdAt: Date.now(),
    })

    return { inviteId, token }
  },
})
