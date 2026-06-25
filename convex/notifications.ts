import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { internalMutation, internalQuery } from "./_generated/server"
import { getFellowForUser } from "./lib/auth"
import {
  canManagePodAsLeader,
  isUmbrellaCohort,
  parentHasChildPods,
} from "./lib/cohortScope"
import {
  authedMutation,
  authedQuery,
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { getNotificationDeliveryStatus } from "./lib/notificationDeliveryStatus"
import {
  alignFirstRunAt,
  computeNextRunAt,
  deriveDayOfMonth,
  getTargetedFellows,
  isFellowTargeted,
  validateNotificationFields,
  validateRecurrenceFields,
  validateTargetFellows,
} from "./lib/notificationHelpers"
import { cohortWorkspacePath } from "./lib/programCode"
import {
  fellowValidator,
  notificationRecipientValidator,
  notificationSubscriptionValidator,
  notificationValidator,
  recurringNotificationValidator,
} from "./lib/validators"

const fellowFeedItemValidator = v.object({
  recipient: notificationRecipientValidator,
  notification: notificationValidator,
})

const leaderRecipientStatsValidator = v.object({
  fellowId: v.id("fellows"),
  name: v.string(),
  pushStatus: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed"),
    v.literal("skipped"),
  ),
  readAt: v.optional(v.number()),
})

const leaderNotificationItemValidator = v.object({
  notification: notificationValidator,
  recipientStats: v.array(leaderRecipientStatsValidator),
  readCount: v.number(),
  targetCount: v.number(),
})

async function canShowLeaderView(
  ctx: QueryCtx & {
    membership: { role: string }
    impersonationSession: unknown
    cohortAccess: { kind: string }
    cohortId: Id<"cohorts">
  },
): Promise<boolean> {
  if (ctx.impersonationSession) {
    return false
  }
  if (ctx.cohortAccess.kind === "umbrellaViewer") {
    return true
  }
  if (ctx.membership.role !== "podLeader") {
    return false
  }
  const cohort = await ctx.db.get("cohorts", ctx.cohortId)
  if (!cohort) {
    return false
  }
  const hasChildPods = isUmbrellaCohort(cohort)
    ? await parentHasChildPods(ctx, ctx.cohortId)
    : false
  return canManagePodAsLeader(cohort, hasChildPods)
}

async function createNotificationWithRecipients(
  ctx: MutationCtx,
  args: {
    cohortId: Id<"cohorts">
    title: string
    body: string
    linkUrl?: string
    targetAllFellows: boolean
    targetFellowIds?: Id<"fellows">[]
    createdByUserId: Id<"users">
    recurringNotificationId?: Id<"recurringNotifications">
  },
): Promise<Id<"notifications">> {
  const fellows = await ctx.db
    .query("fellows")
    .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
    .collect()

  const targetedFellows = getTargetedFellows(
    {
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetFellowIds,
    },
    fellows,
  )

  const notificationId = await ctx.db.insert("notifications", {
    cohortId: args.cohortId,
    title: args.title.trim(),
    body: args.body.trim(),
    linkUrl: args.linkUrl,
    targetAllFellows: args.targetAllFellows,
    targetFellowIds: args.targetAllFellows ? undefined : args.targetFellowIds,
    createdByUserId: args.createdByUserId,
    createdAt: Date.now(),
    status: "pending",
    recurringNotificationId: args.recurringNotificationId,
  })

  for (const fellow of targetedFellows) {
    await ctx.db.insert("notificationRecipients", {
      notificationId,
      cohortId: args.cohortId,
      fellowId: fellow._id,
      userId: fellow.userId,
      pushStatus: fellow.userId ? "pending" : "skipped",
    })
  }

  await ctx.scheduler.runAfter(
    0,
    internal.notificationDelivery.deliverNotification,
    { notificationId },
  )

  return notificationId
}

export const upsertPushSubscription = authedMutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  returns: notificationSubscriptionValidator,
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("notificationSubscriptions")
      .withIndex("by_user_and_endpoint", (q) =>
        q.eq("userId", ctx.user._id).eq("endpoint", args.endpoint),
      )
      .unique()

    if (existing) {
      await ctx.db.patch("notificationSubscriptions", existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        enabled: true,
        userAgent: args.userAgent,
        updatedAt: now,
      })
      const updated = await ctx.db.get(
        "notificationSubscriptions",
        existing._id,
      )
      if (!updated) {
        throw new Error("Subscription not found")
      }
      return updated
    }

    const subscriptionId = await ctx.db.insert("notificationSubscriptions", {
      userId: ctx.user._id,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      enabled: true,
      userAgent: args.userAgent,
      createdAt: now,
      updatedAt: now,
    })

    const created = await ctx.db.get(
      "notificationSubscriptions",
      subscriptionId,
    )
    if (!created) {
      throw new Error("Subscription not found")
    }
    return created
  },
})

export const disablePushSubscription = authedMutation({
  args: {
    endpoint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationSubscriptions")
      .withIndex("by_user_and_endpoint", (q) =>
        q.eq("userId", ctx.user._id).eq("endpoint", args.endpoint),
      )
      .unique()

    if (existing) {
      await ctx.db.patch("notificationSubscriptions", existing._id, {
        enabled: false,
        updatedAt: Date.now(),
      })
    }
    return null
  },
})

export const getMyPushSubscription = authedQuery({
  args: {},
  returns: v.union(notificationSubscriptionValidator, v.null()),
  handler: async (ctx) => {
    const subscriptions = await ctx.db
      .query("notificationSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect()

    return subscriptions.find((sub) => sub.enabled) ?? null
  },
})

export const listNotifications = cohortQuery({
  args: {
    cohortId: v.id("cohorts"),
  },
  returns: v.union(
    v.object({
      view: v.literal("leader"),
      fellows: v.array(fellowValidator),
      notifications: v.array(leaderNotificationItemValidator),
      recurring: v.array(recurringNotificationValidator),
    }),
    v.object({
      view: v.literal("fellow"),
      items: v.array(fellowFeedItemValidator),
      unreadCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const showLeaderView = await canShowLeaderView(ctx)

    if (showLeaderView) {
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
        .collect()

      const sorted = notifications.sort((a, b) => b.createdAt - a.createdAt)

      const recurring = await ctx.db
        .query("recurringNotifications")
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
        .collect()

      const items = await Promise.all(
        sorted.map(async (notification) => {
          const recipients = await ctx.db
            .query("notificationRecipients")
            .withIndex("by_notification", (q) =>
              q.eq("notificationId", notification._id),
            )
            .collect()

          const targetedFellows = getTargetedFellows(notification, fellows)
          const recipientByFellowId = new Map(
            recipients.map((r) => [r.fellowId, r]),
          )

          const recipientStats = targetedFellows
            .map((fellow) => {
              const recipient = recipientByFellowId.get(fellow._id)
              return {
                fellowId: fellow._id,
                name: fellow.name,
                pushStatus: recipient?.pushStatus ?? ("skipped" as const),
                readAt: recipient?.readAt,
              }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

          const readCount = recipientStats.filter((s) => s.readAt).length

          return {
            notification,
            recipientStats,
            readCount,
            targetCount: targetedFellows.length,
          }
        }),
      )

      return {
        view: "leader" as const,
        fellows,
        notifications: items,
        recurring: recurring.sort((a, b) => b.createdAt - a.createdAt),
      }
    }

    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return {
        view: "fellow" as const,
        items: [],
        unreadCount: 0,
      }
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const items: Array<{
      recipient: Doc<"notificationRecipients">
      notification: Doc<"notifications">
    }> = []

    for (const notification of notifications) {
      if (!isFellowTargeted(notification, fellow._id)) {
        continue
      }
      const recipient = await ctx.db
        .query("notificationRecipients")
        .withIndex("by_notification_and_fellow", (q) =>
          q.eq("notificationId", notification._id).eq("fellowId", fellow._id),
        )
        .unique()
      if (!recipient) {
        continue
      }
      items.push({ recipient, notification })
    }

    items.sort((a, b) => b.notification.createdAt - a.notification.createdAt)

    const unreadCount = items.filter((item) => !item.recipient.readAt).length

    return {
      view: "fellow" as const,
      items,
      unreadCount,
    }
  },
})

export const sendTestPushNotification = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
  },
  returns: v.null(),
  handler: async (ctx, _args) => {
    const subscriptions = await ctx.db
      .query("notificationSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect()

    if (!subscriptions.some((subscription) => subscription.enabled)) {
      throw new Error("Turn on browser notifications before sending a test.")
    }

    await ctx.scheduler.runAfter(
      0,
      internal.notificationDelivery.sendTestPushToUser,
      {
        userId: ctx.user._id,
        title: "Test notification",
        body: "If you see this, pod push notifications are working.",
        linkUrl: cohortWorkspacePath(ctx.cohort.programCode, "notifications"),
      },
    )

    return null
  },
})

export const createNotification = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
    body: v.string(),
    linkUrl: v.optional(v.string()),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
  },
  returns: notificationValidator,
  handler: async (ctx, args) => {
    validateNotificationFields(args)
    await validateTargetFellows(
      ctx,
      args.cohortId,
      args.targetAllFellows,
      args.targetFellowIds,
    )

    const linkUrl = args.linkUrl?.trim() || undefined

    const notificationId = await createNotificationWithRecipients(ctx, {
      cohortId: args.cohortId,
      title: args.title,
      body: args.body,
      linkUrl,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetFellowIds,
      createdByUserId: ctx.user._id,
    })

    const created = await ctx.db.get("notifications", notificationId)
    if (!created) {
      throw new Error("Notification not found")
    }
    return created
  },
})

export const createRecurringNotification = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
    body: v.string(),
    linkUrl: v.optional(v.string()),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
    cadence: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    weekdays: v.optional(v.array(v.number())),
    dayOfMonth: v.optional(v.number()),
    timeOfDayMinutes: v.number(),
    nextRunAt: v.number(),
    endAt: v.optional(v.number()),
  },
  returns: recurringNotificationValidator,
  handler: async (ctx, args) => {
    validateNotificationFields(args)
    validateRecurrenceFields({
      cadence: args.cadence,
      weekdays: args.weekdays,
      dayOfMonth: args.dayOfMonth,
      timeOfDayMinutes: args.timeOfDayMinutes,
      nextRunAt: args.nextRunAt,
    })
    await validateTargetFellows(
      ctx,
      args.cohortId,
      args.targetAllFellows,
      args.targetFellowIds,
    )

    const alignedNextRunAt = alignFirstRunAt({
      cadence: args.cadence,
      timeOfDayMinutes: args.timeOfDayMinutes,
      weekdays: args.weekdays,
      dayOfMonth: args.dayOfMonth,
      firstRunAt: args.nextRunAt,
    })

    if (alignedNextRunAt <= Date.now()) {
      throw new Error("First run must be in the future")
    }

    const linkUrl = args.linkUrl?.trim() || undefined
    const dayOfMonth =
      args.cadence === "monthly"
        ? (args.dayOfMonth ?? deriveDayOfMonth(alignedNextRunAt))
        : undefined

    const recurringId = await ctx.db.insert("recurringNotifications", {
      cohortId: args.cohortId,
      title: args.title.trim(),
      body: args.body.trim(),
      linkUrl,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetAllFellows ? undefined : args.targetFellowIds,
      cadence: args.cadence,
      weekdays: args.cadence === "weekly" ? args.weekdays : undefined,
      dayOfMonth,
      timeOfDayMinutes: args.timeOfDayMinutes,
      nextRunAt: alignedNextRunAt,
      endAt: args.endAt,
      enabled: true,
      createdByUserId: ctx.user._id,
      createdAt: Date.now(),
    })

    const created = await ctx.db.get("recurringNotifications", recurringId)
    if (!created) {
      throw new Error("Recurring notification not found")
    }
    return created
  },
})

export const updateRecurringNotification = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    recurringNotificationId: v.id("recurringNotifications"),
    title: v.string(),
    body: v.string(),
    linkUrl: v.optional(v.string()),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
    cadence: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    weekdays: v.optional(v.array(v.number())),
    dayOfMonth: v.optional(v.number()),
    timeOfDayMinutes: v.number(),
    nextRunAt: v.number(),
    endAt: v.optional(v.number()),
    enabled: v.boolean(),
  },
  returns: recurringNotificationValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(
      "recurringNotifications",
      args.recurringNotificationId,
    )
    if (!existing || existing.cohortId !== args.cohortId) {
      throw new Error("Recurring notification not found")
    }

    validateNotificationFields(args)
    validateRecurrenceFields({
      cadence: args.cadence,
      weekdays: args.weekdays,
      dayOfMonth: args.dayOfMonth,
      timeOfDayMinutes: args.timeOfDayMinutes,
      nextRunAt: args.nextRunAt,
    })
    await validateTargetFellows(
      ctx,
      args.cohortId,
      args.targetAllFellows,
      args.targetFellowIds,
    )

    const alignedNextRunAt = alignFirstRunAt({
      cadence: args.cadence,
      timeOfDayMinutes: args.timeOfDayMinutes,
      weekdays: args.weekdays,
      dayOfMonth: args.dayOfMonth,
      firstRunAt: args.nextRunAt,
    })

    if (args.enabled && alignedNextRunAt <= Date.now()) {
      throw new Error("Next run must be in the future")
    }

    const linkUrl = args.linkUrl?.trim() || undefined
    const dayOfMonth =
      args.cadence === "monthly"
        ? (args.dayOfMonth ?? deriveDayOfMonth(alignedNextRunAt))
        : undefined

    await ctx.db.patch("recurringNotifications", args.recurringNotificationId, {
      title: args.title.trim(),
      body: args.body.trim(),
      linkUrl,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetAllFellows ? undefined : args.targetFellowIds,
      cadence: args.cadence,
      weekdays: args.cadence === "weekly" ? args.weekdays : undefined,
      dayOfMonth,
      timeOfDayMinutes: args.timeOfDayMinutes,
      nextRunAt: alignedNextRunAt,
      endAt: args.endAt,
      enabled: args.enabled,
    })

    const updated = await ctx.db.get(
      "recurringNotifications",
      args.recurringNotificationId,
    )
    if (!updated) {
      throw new Error("Recurring notification not found")
    }
    return updated
  },
})

export const deleteRecurringNotification = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    recurringNotificationId: v.id("recurringNotifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(
      "recurringNotifications",
      args.recurringNotificationId,
    )
    if (!existing || existing.cohortId !== args.cohortId) {
      throw new Error("Recurring notification not found")
    }
    await ctx.db.delete("recurringNotifications", args.recurringNotificationId)
    return null
  },
})

export const markNotificationRead = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    notificationId: v.id("notifications"),
  },
  returns: notificationRecipientValidator,
  handler: async (ctx, args) => {
    const notification = await ctx.db.get("notifications", args.notificationId)
    if (!notification || notification.cohortId !== args.cohortId) {
      throw new Error("Notification not found")
    }

    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      throw new Error("Fellow record not found")
    }

    if (!isFellowTargeted(notification, fellow._id)) {
      throw new Error("This notification is not assigned to you")
    }

    const existing = await ctx.db
      .query("notificationRecipients")
      .withIndex("by_notification_and_fellow", (q) =>
        q.eq("notificationId", args.notificationId).eq("fellowId", fellow._id),
      )
      .unique()

    if (!existing) {
      throw new Error("Recipient record not found")
    }

    if (existing.readAt) {
      return existing
    }

    const now = Date.now()
    await ctx.db.patch("notificationRecipients", existing._id, {
      readAt: now,
      userId: ctx.user._id,
    })

    const updated = await ctx.db.get("notificationRecipients", existing._id)
    if (!updated) {
      throw new Error("Recipient record not found")
    }
    return updated
  },
})

export const markAllNotificationsRead = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return 0
    }

    const recipients = await ctx.db
      .query("notificationRecipients")
      .withIndex("by_cohort_and_user", (q) =>
        q.eq("cohortId", args.cohortId).eq("userId", ctx.user._id),
      )
      .collect()

    const now = Date.now()
    let updatedCount = 0

    for (const recipient of recipients) {
      if (recipient.readAt) {
        continue
      }
      const notification = await ctx.db.get(
        "notifications",
        recipient.notificationId,
      )
      if (!notification || !isFellowTargeted(notification, fellow._id)) {
        continue
      }
      await ctx.db.patch("notificationRecipients", recipient._id, {
        readAt: now,
      })
      updatedCount++
    }

    return updatedCount
  },
})

export const getUserEnabledPushSubscriptions = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(notificationSubscriptionValidator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("notificationSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()

    return subscriptions.filter((subscription) => subscription.enabled)
  },
})

export const getDeliveryContext = internalQuery({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.union(
    v.object({
      notification: notificationValidator,
      recipients: v.array(notificationRecipientValidator),
      subscriptions: v.array(notificationSubscriptionValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get("notifications", args.notificationId)
    if (!notification) {
      return null
    }

    const recipients = await ctx.db
      .query("notificationRecipients")
      .withIndex("by_notification", (q) =>
        q.eq("notificationId", args.notificationId),
      )
      .collect()

    const userIds = new Set(
      recipients
        .map((r) => r.userId)
        .filter((id): id is Id<"users"> => id !== undefined),
    )

    const subscriptions: Doc<"notificationSubscriptions">[] = []
    for (const userId of userIds) {
      const userSubs = await ctx.db
        .query("notificationSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      subscriptions.push(...userSubs.filter((sub) => sub.enabled))
    }

    return { notification, recipients, subscriptions }
  },
})

export const applyDeliveryResults = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    results: v.array(
      v.object({
        recipientId: v.id("notificationRecipients"),
        pushStatus: v.union(
          v.literal("sent"),
          v.literal("failed"),
          v.literal("skipped"),
        ),
        pushError: v.optional(v.string()),
        disableSubscriptionIds: v.optional(
          v.array(v.id("notificationSubscriptions")),
        ),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()

    for (const result of args.results) {
      await ctx.db.patch("notificationRecipients", result.recipientId, {
        pushStatus: result.pushStatus,
        pushSentAt: result.pushStatus === "sent" ? now : undefined,
        pushError: result.pushError,
      })

      for (const subscriptionId of result.disableSubscriptionIds ?? []) {
        await ctx.db.patch("notificationSubscriptions", subscriptionId, {
          enabled: false,
          updatedAt: now,
        })
      }
    }

    const recipients = await ctx.db
      .query("notificationRecipients")
      .withIndex("by_notification", (q) =>
        q.eq("notificationId", args.notificationId),
      )
      .collect()

    const rollup = {
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    }
    for (const recipient of recipients) {
      rollup[recipient.pushStatus]++
    }

    const status = getNotificationDeliveryStatus(rollup)
    await ctx.db.patch("notifications", args.notificationId, { status })
    return null
  },
})

export const materializeRecurringNotifications = internalMutation({
  args: {},
  returns: v.object({ materialized: v.number() }),
  handler: async (ctx) => {
    const now = Date.now()
    const dueSchedules = await ctx.db
      .query("recurringNotifications")
      .withIndex("by_enabled_and_next_run", (q) =>
        q.eq("enabled", true).lte("nextRunAt", now),
      )
      .collect()

    let materialized = 0

    for (const schedule of dueSchedules) {
      if (schedule.endAt && now > schedule.endAt) {
        await ctx.db.patch("recurringNotifications", schedule._id, {
          enabled: false,
        })
        continue
      }

      await createNotificationWithRecipients(ctx, {
        cohortId: schedule.cohortId,
        title: schedule.title,
        body: schedule.body,
        linkUrl: schedule.linkUrl,
        targetAllFellows: schedule.targetAllFellows,
        targetFellowIds: schedule.targetFellowIds,
        createdByUserId: schedule.createdByUserId,
        recurringNotificationId: schedule._id,
      })

      const nextRunAt = computeNextRunAt({
        cadence: schedule.cadence,
        timeOfDayMinutes: schedule.timeOfDayMinutes,
        weekdays: schedule.weekdays,
        dayOfMonth: schedule.dayOfMonth,
        afterTimestamp: now,
      })

      const shouldDisable = schedule.endAt && nextRunAt > schedule.endAt

      await ctx.db.patch("recurringNotifications", schedule._id, {
        nextRunAt,
        lastRunAt: now,
        enabled: shouldDisable ? false : schedule.enabled,
      })

      materialized++
    }

    return { materialized }
  },
})

export const retryStalePendingDeliveries = internalMutation({
  args: {},
  returns: v.object({ scheduled: v.number() }),
  handler: async (ctx) => {
    const staleBefore = Date.now() - 5 * 60 * 1000
    const pendingNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect()
    const partialNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", "partial"))
      .collect()

    let scheduled = 0
    for (const notification of [
      ...pendingNotifications,
      ...partialNotifications,
    ]) {
      if (notification.createdAt > staleBefore) {
        continue
      }

      const pendingRecipients = await ctx.db
        .query("notificationRecipients")
        .withIndex("by_notification", (q) =>
          q.eq("notificationId", notification._id),
        )
        .collect()

      if (
        pendingRecipients.some(
          (recipient) => recipient.pushStatus === "pending",
        )
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.notificationDelivery.deliverNotification,
          { notificationId: notification._id },
        )
        scheduled++
      }
    }

    return { scheduled }
  },
})
