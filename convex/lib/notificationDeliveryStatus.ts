export type NotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "partial"
  | "failed"

export type RecipientDeliveryRollup = {
  pending: number
  sent: number
  failed: number
  skipped: number
}

export function getNotificationDeliveryStatus(
  rollup: RecipientDeliveryRollup,
): NotificationDeliveryStatus {
  const completed = rollup.sent + rollup.failed + rollup.skipped

  if (rollup.pending > 0) {
    return completed > 0 ? "partial" : "pending"
  }

  if (completed === 0) {
    return "failed"
  }

  if (rollup.failed === 0) {
    return "sent"
  }

  if (rollup.sent === 0 && rollup.skipped === 0) {
    return "failed"
  }

  return "partial"
}
