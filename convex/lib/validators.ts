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
  calendlyUrl: v.optional(v.string()),
  discordUsername: v.optional(v.string()),
  createdAt: v.number(),
  isPlatformAdmin: v.optional(v.boolean()),
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

export const notificationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("partial"),
  v.literal("failed"),
)

export const pushDeliveryStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("skipped"),
)

export const recurrenceCadenceValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
)

export const notificationSubscriptionValidator = v.object({
  _id: v.id("notificationSubscriptions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
  enabled: v.boolean(),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const notificationValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  title: v.string(),
  body: v.string(),
  linkUrl: v.optional(v.string()),
  targetAllFellows: v.boolean(),
  targetFellowIds: v.optional(v.array(v.id("fellows"))),
  createdByUserId: v.id("users"),
  createdAt: v.number(),
  status: notificationStatusValidator,
  recurringNotificationId: v.optional(v.id("recurringNotifications")),
})

export const notificationRecipientValidator = v.object({
  _id: v.id("notificationRecipients"),
  _creationTime: v.number(),
  notificationId: v.id("notifications"),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  userId: v.optional(v.id("users")),
  readAt: v.optional(v.number()),
  pushStatus: pushDeliveryStatusValidator,
  pushSentAt: v.optional(v.number()),
  pushError: v.optional(v.string()),
})

export const recurringNotificationValidator = v.object({
  _id: v.id("recurringNotifications"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  title: v.string(),
  body: v.string(),
  linkUrl: v.optional(v.string()),
  targetAllFellows: v.boolean(),
  targetFellowIds: v.optional(v.array(v.id("fellows"))),
  cadence: recurrenceCadenceValidator,
  weekdays: v.optional(v.array(v.number())),
  dayOfMonth: v.optional(v.number()),
  timeOfDayMinutes: v.number(),
  nextRunAt: v.number(),
  endAt: v.optional(v.number()),
  enabled: v.boolean(),
  createdByUserId: v.id("users"),
  createdAt: v.number(),
  lastRunAt: v.optional(v.number()),
})
