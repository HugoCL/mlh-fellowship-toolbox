import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  cohortStatusValidator,
  inviteStatusValidator,
  notificationStatusValidator,
  oneOnOneStatusValidator,
  pushDeliveryStatusValidator,
  recurrenceCadenceValidator,
  roleValidator,
} from "./lib/validators"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    calendlyUrl: v.optional(v.string()),
    discordUsername: v.optional(v.string()),
    createdAt: v.number(),
    /** First bootstrap user (WordPress-style); can create cohorts before any exist. */
    isPlatformAdmin: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  cohorts: defineTable({
    name: v.string(),
    programCode: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    status: cohortStatusValidator,
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    /** Set on pod groups; the umbrella cohort that owns this group. */
    parentCohortId: v.optional(v.id("cohorts")),
    /** Numeric suffix for program code (e.g. 1 → 26.SUM.B.1). */
    groupNumber: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_parent", ["parentCohortId"])
    .index("by_program_code", ["programCode"]),

  cohortMemberships: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
    role: roleValidator,
    joinedAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_user", ["userId"])
    .index("by_cohort_and_user", ["cohortId", "userId"]),

  fellows: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.optional(v.id("users")),
    name: v.string(),
    email: v.string(),
    calendlyUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_and_email", ["cohortId", "email"])
    .index("by_user", ["userId"]),

  invites: defineTable({
    cohortId: v.id("cohorts"),
    email: v.string(),
    role: roleValidator,
    token: v.string(),
    status: inviteStatusValidator,
    invitedByUserId: v.id("users"),
    createdAt: v.number(),
    /** Child cohort created when a pod leader accepts and sets up their group. */
    groupCohortId: v.optional(v.id("cohorts")),
  })
    .index("by_token", ["token"])
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_and_email", ["cohortId", "email"])
    .index("by_email", ["email"]),

  oneOnOneInstances: defineTable({
    cohortId: v.id("cohorts"),
    title: v.string(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_cohort", ["cohortId"]),

  peerOneOnOnes: defineTable({
    cohortId: v.id("cohorts"),
    fellowAId: v.id("fellows"),
    fellowBId: v.id("fellows"),
    status: oneOnOneStatusValidator,
    updatedAt: v.number(),
    updatedByUserId: v.optional(v.id("users")),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_fellow_a", ["fellowAId"])
    .index("by_fellow_b", ["fellowBId"])
    .index("by_cohort_and_pair", ["cohortId", "fellowAId", "fellowBId"]),

  leaderOneOnOnes: defineTable({
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    instanceId: v.id("oneOnOneInstances"),
    status: oneOnOneStatusValidator,
    updatedAt: v.number(),
    updatedByUserId: v.optional(v.id("users")),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_fellow", ["fellowId"])
    .index("by_instance", ["instanceId"])
    .index("by_cohort_fellow_and_instance", [
      "cohortId",
      "fellowId",
      "instanceId",
    ]),

  mentors: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.optional(v.id("users")),
    name: v.string(),
    email: v.optional(v.string()),
    calendlyUrl: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_and_email", ["cohortId", "email"])
    .index("by_user", ["userId"]),

  mentorMeetingRounds: defineTable({
    cohortId: v.id("cohorts"),
    roundNumber: v.number(),
    targetWeekLabel: v.string(),
    targetWeekStart: v.number(),
    createdAt: v.number(),
  }).index("by_cohort", ["cohortId"]),

  mentorMeetingAssignments: defineTable({
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    mentorId: v.id("mentors"),
    roundId: v.id("mentorMeetingRounds"),
    scheduled: v.boolean(),
    completed: v.boolean(),
    updatedAt: v.number(),
    updatedByUserId: v.optional(v.id("users")),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_fellow", ["fellowId"])
    .index("by_round", ["roundId"]),

  demoDays: defineTable({
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    demoDate: v.number(),
    completed: v.boolean(),
    updatedAt: v.number(),
    updatedByUserId: v.optional(v.id("users")),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_fellow", ["fellowId"]),

  lightningTalkSlots: defineTable({
    cohortId: v.id("cohorts"),
    slotDate: v.number(),
    maxEnrollments: v.number(),
    createdAt: v.number(),
  }).index("by_cohort", ["cohortId"]),

  lightningTalks: defineTable({
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    slotId: v.id("lightningTalkSlots"),
    topic: v.string(),
    completed: v.boolean(),
    updatedAt: v.number(),
    updatedByUserId: v.optional(v.id("users")),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_fellow", ["fellowId"])
    .index("by_slot", ["slotId"]),

  actionItems: defineTable({
    cohortId: v.id("cohorts"),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    dueAt: v.number(),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_cohort", ["cohortId"]),

  actionItemCompletions: defineTable({
    actionItemId: v.id("actionItems"),
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    completedAt: v.number(),
    updatedByUserId: v.id("users"),
  })
    .index("by_action_item", ["actionItemId"])
    .index("by_cohort_and_fellow", ["cohortId", "fellowId"])
    .index("by_action_item_and_fellow", ["actionItemId", "fellowId"]),

  /** Active impersonation session — one per actor at a time. */
  impersonationSessions: defineTable({
    actorUserId: v.id("users"),
    fellowId: v.id("fellows"),
    cohortId: v.id("cohorts"),
    startedAt: v.number(),
  }).index("by_actor", ["actorUserId"]),

  notificationSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    enabled: v.boolean(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"])
    .index("by_user_and_endpoint", ["userId", "endpoint"]),

  notifications: defineTable({
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
    .index("by_cohort", ["cohortId"])
    .index("by_cohort_and_created", ["cohortId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_recurring", ["recurringNotificationId"]),

  notificationRecipients: defineTable({
    notificationId: v.id("notifications"),
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    userId: v.optional(v.id("users")),
    readAt: v.optional(v.number()),
    pushStatus: pushDeliveryStatusValidator,
    pushSentAt: v.optional(v.number()),
    pushError: v.optional(v.string()),
  })
    .index("by_notification", ["notificationId"])
    .index("by_user", ["userId"])
    .index("by_cohort_and_user", ["cohortId", "userId"])
    .index("by_notification_and_fellow", ["notificationId", "fellowId"])
    .index("by_push_status", ["pushStatus"]),

  recurringNotifications: defineTable({
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
    .index("by_cohort", ["cohortId"])
    .index("by_enabled_and_next_run", ["enabled", "nextRunAt"]),
})
