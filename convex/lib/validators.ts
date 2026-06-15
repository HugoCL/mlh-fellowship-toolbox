import { v } from "convex/values"

export const roleValidator = v.union(
  v.literal("podLeader"),
  v.literal("fellow"),
  v.literal("mentor"),
)

export const directoryInviteRoleValidator = v.union(
  v.literal("fellow"),
  v.literal("mentor"),
)

export const oneOnOneStatusValidator = v.union(
  v.literal("notStarted"),
  v.literal("scheduled"),
  v.literal("completed"),
)

export const cohortStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
)

export const inviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
)

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
})

export const cohortValidator = v.object({
  _id: v.id("cohorts"),
  _creationTime: v.number(),
  name: v.string(),
  programCode: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  status: cohortStatusValidator,
  createdByUserId: v.id("users"),
  createdAt: v.number(),
  parentCohortId: v.optional(v.id("cohorts")),
  groupNumber: v.optional(v.number()),
})

export const fellowValidator = v.object({
  _id: v.id("fellows"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  userId: v.optional(v.id("users")),
  name: v.string(),
  email: v.string(),
  calendlyUrl: v.optional(v.string()),
  createdAt: v.number(),
})

export const mentorValidator = v.object({
  _id: v.id("mentors"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  userId: v.optional(v.id("users")),
  name: v.string(),
  email: v.optional(v.string()),
  calendlyUrl: v.string(),
  active: v.boolean(),
  createdAt: v.number(),
})

export const membershipValidator = v.object({
  _id: v.id("cohortMemberships"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  userId: v.id("users"),
  role: roleValidator,
  joinedAt: v.number(),
})
