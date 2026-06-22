import type { Doc, Id } from "@/convex/_generated/dataModel"
import { toProgramDateTimeInputValue } from "@/lib/dates"
import { minutesToTimeInput } from "@/lib/notification-schedule"

export type TargetMode = "all" | "specific"

export type NotificationFormState = {
  title: string
  body: string
  linkUrl: string
  targetMode: TargetMode
  selectedFellowIds: Set<string>
}

export type RecurringFormState = NotificationFormState & {
  cadence: "daily" | "weekly" | "monthly"
  weekdays: Set<number>
  timeOfDay: string
  nextRunAt: string
  endAt: string
  enabled: boolean
}

export const emptyNotificationForm = (): NotificationFormState => ({
  title: "",
  body: "",
  linkUrl: "",
  targetMode: "all",
  selectedFellowIds: new Set(),
})

export const emptyRecurringForm = (): RecurringFormState => ({
  ...emptyNotificationForm(),
  cadence: "weekly",
  weekdays: new Set([1]),
  timeOfDay: "09:00",
  nextRunAt: "",
  endAt: "",
  enabled: true,
})

export function notificationFormFromItem(
  item: Pick<
    Doc<"notifications">,
    "title" | "body" | "linkUrl" | "targetAllFellows" | "targetFellowIds"
  >,
): NotificationFormState {
  return {
    title: item.title,
    body: item.body,
    linkUrl: item.linkUrl ?? "",
    targetMode: item.targetAllFellows ? "all" : "specific",
    selectedFellowIds: new Set(item.targetFellowIds ?? []),
  }
}

export function recurringFormFromItem(
  item: Doc<"recurringNotifications">,
): RecurringFormState {
  return {
    ...notificationFormFromItem(item),
    cadence: item.cadence,
    weekdays: new Set(item.weekdays ?? []),
    timeOfDay: minutesToTimeInput(item.timeOfDayMinutes),
    nextRunAt: toProgramDateTimeInputValue(item.nextRunAt),
    endAt: item.endAt ? toProgramDateTimeInputValue(item.endAt) : "",
    enabled: item.enabled,
  }
}

export function getNotificationStatusLabel(
  status: Doc<"notifications">["status"],
): string {
  switch (status) {
    case "pending":
      return "Pending"
    case "sent":
      return "Sent"
    case "partial":
      return "Partial"
    case "failed":
      return "Failed"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function buildTargetPayload(form: NotificationFormState) {
  return {
    targetAllFellows: form.targetMode === "all",
    targetFellowIds:
      form.targetMode === "all"
        ? undefined
        : (Array.from(form.selectedFellowIds) as Id<"fellows">[]),
  }
}
