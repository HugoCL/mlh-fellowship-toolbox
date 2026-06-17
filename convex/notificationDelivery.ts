"use node"

import { v } from "convex/values"
import webpush from "web-push"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { internalAction } from "./_generated/server"

type DeliveryResult = {
  recipientId: Id<"notificationRecipients">
  pushStatus: "sent" | "failed" | "skipped"
  pushError?: string
  disableSubscriptionIds?: Id<"notificationSubscriptions">[]
}

type DeliverySummary = {
  sent: number
  failed: number
  skipped: number
}

function getVapidConfig() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID configuration. Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.",
    )
  }

  return { subject, publicKey, privateKey }
}

export const deliverNotification = internalAction({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.object({
    sent: v.number(),
    failed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args): Promise<DeliverySummary> => {
    const context = await ctx.runQuery(
      internal.notifications.getDeliveryContext,
      {
        notificationId: args.notificationId,
      },
    )

    if (!context) {
      return { sent: 0, failed: 0, skipped: 0 }
    }

    const notification: Doc<"notifications"> = context.notification
    const recipients: Doc<"notificationRecipients">[] = context.recipients
    const subscriptions: Doc<"notificationSubscriptions">[] =
      context.subscriptions
    const subscriptionsByUserId = new Map<Id<"users">, typeof subscriptions>()
    for (const subscription of subscriptions) {
      const existing = subscriptionsByUserId.get(subscription.userId) ?? []
      existing.push(subscription)
      subscriptionsByUserId.set(subscription.userId, existing)
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: "/icon.png",
      url: notification.linkUrl ?? "/",
    })

    const results: DeliveryResult[] = []

    let sent = 0
    let failed = 0
    let skipped = 0

    try {
      const { subject, publicKey, privateKey } = getVapidConfig()
      webpush.setVapidDetails(subject, publicKey, privateKey)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Missing VAPID configuration"
      const failedResults: DeliveryResult[] = recipients
        .filter((recipient) => recipient.pushStatus === "pending")
        .map((recipient) => ({
          recipientId: recipient._id,
          pushStatus: "failed" as const,
          pushError: message,
        }))

      await ctx.runMutation(internal.notifications.applyDeliveryResults, {
        notificationId: args.notificationId,
        results: failedResults,
      })

      return { sent: 0, failed: failedResults.length, skipped: 0 }
    }

    for (const recipient of recipients) {
      if (recipient.pushStatus !== "pending") {
        continue
      }

      if (!recipient.userId) {
        results.push({
          recipientId: recipient._id,
          pushStatus: "skipped",
        })
        skipped++
        continue
      }

      const userSubscriptions =
        subscriptionsByUserId.get(recipient.userId) ?? []
      if (userSubscriptions.length === 0) {
        results.push({
          recipientId: recipient._id,
          pushStatus: "skipped",
        })
        skipped++
        continue
      }

      let deviceSent = 0
      const deviceErrors: string[] = []
      const disableSubscriptionIds: Id<"notificationSubscriptions">[] = []

      for (const subscription of userSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          )
          deviceSent++
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to send push"
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
              ? error.statusCode
              : undefined

          if (statusCode === 404 || statusCode === 410) {
            disableSubscriptionIds.push(subscription._id)
          }
          deviceErrors.push(message)
        }
      }

      if (deviceSent > 0) {
        results.push({
          recipientId: recipient._id,
          pushStatus: "sent",
          pushError:
            deviceErrors.length > 0 ? deviceErrors.join("; ") : undefined,
          disableSubscriptionIds,
        })
        sent++
      } else {
        results.push({
          recipientId: recipient._id,
          pushStatus: "failed",
          pushError: deviceErrors.join("; ") || "Failed to send push",
          disableSubscriptionIds,
        })
        failed++
      }
    }

    await ctx.runMutation(internal.notifications.applyDeliveryResults, {
      notificationId: args.notificationId,
      results,
    })

    return { sent, failed, skipped }
  },
})
