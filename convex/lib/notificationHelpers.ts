import { fromAbsolute, toCalendarDate, toZoned } from "@internationalized/date"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { getProgramWeekday, PROGRAM_TIMEZONE } from "./dates"

export type NotificationTarget = Pick<
  Doc<"notifications">,
  "targetAllFellows" | "targetFellowIds"
>

export function isFellowTargeted(
  item: NotificationTarget,
  fellowId: Id<"fellows">,
): boolean {
  if (item.targetAllFellows) {
    return true
  }
  return item.targetFellowIds?.includes(fellowId) ?? false
}

export function getTargetedFellows(
  item: NotificationTarget,
  fellows: Doc<"fellows">[],
): Doc<"fellows">[] {
  if (item.targetAllFellows) {
    return fellows
  }
  const targetIds = new Set(item.targetFellowIds ?? [])
  return fellows.filter((fellow) => targetIds.has(fellow._id))
}

export function validateNotificationFields(args: {
  title: string
  body: string
  targetAllFellows: boolean
  targetFellowIds?: Id<"fellows">[]
}): void {
  if (!args.title.trim()) {
    throw new Error("Title is required")
  }
  if (!args.body.trim()) {
    throw new Error("Message is required")
  }
  if (!args.targetAllFellows) {
    if (!args.targetFellowIds || args.targetFellowIds.length === 0) {
      throw new Error("Select at least one fellow")
    }
  }
}

export async function validateTargetFellows(
  ctx: Pick<MutationCtx, "db">,
  cohortId: Id<"cohorts">,
  targetAllFellows: boolean,
  targetFellowIds: Id<"fellows">[] | undefined,
): Promise<void> {
  if (targetAllFellows) {
    return
  }
  if (!targetFellowIds || targetFellowIds.length === 0) {
    throw new Error("Select at least one fellow")
  }
  for (const fellowId of targetFellowIds) {
    const fellow = await ctx.db.get("fellows", fellowId)
    if (!fellow || fellow.cohortId !== cohortId) {
      throw new Error("One or more selected fellows are invalid")
    }
  }
}

export function validateRecurrenceFields(args: {
  cadence: "daily" | "weekly" | "monthly"
  weekdays?: number[]
  dayOfMonth?: number
  timeOfDayMinutes: number
  nextRunAt: number
}): void {
  if (args.timeOfDayMinutes < 0 || args.timeOfDayMinutes >= 24 * 60) {
    throw new Error("Invalid time of day")
  }
  if (args.cadence === "weekly") {
    if (!args.weekdays || args.weekdays.length === 0) {
      throw new Error("Select at least one weekday")
    }
    for (const day of args.weekdays) {
      if (day < 0 || day > 6) {
        throw new Error("Invalid weekday")
      }
    }
  }
  if (args.cadence === "monthly") {
    const day =
      args.dayOfMonth ??
      toCalendarDate(fromAbsolute(args.nextRunAt, PROGRAM_TIMEZONE)).day
    if (day < 1 || day > 31) {
      throw new Error("Invalid day of month")
    }
  }
}

export function alignFirstRunAt(args: {
  cadence: "daily" | "weekly" | "monthly"
  timeOfDayMinutes: number
  weekdays?: number[]
  dayOfMonth?: number
  firstRunAt: number
}): number {
  const firstRunDate = toCalendarDate(
    fromAbsolute(args.firstRunAt, PROGRAM_TIMEZONE),
  )
  const candidate = atTimeOfDay(firstRunDate, args.timeOfDayMinutes)
  const candidateMs = candidate.toDate().getTime()

  if (args.cadence === "daily") {
    return candidateMs >= args.firstRunAt
      ? candidateMs
      : computeNextRunAt({
          cadence: args.cadence,
          timeOfDayMinutes: args.timeOfDayMinutes,
          afterTimestamp: args.firstRunAt,
        })
  }

  if (args.cadence === "weekly") {
    const allowed = args.weekdays ?? [getProgramWeekday(args.firstRunAt)]
    const candidateWeekday = getProgramWeekday(candidateMs)
    if (allowed.includes(candidateWeekday) && candidateMs >= args.firstRunAt) {
      return candidateMs
    }
    return computeNextRunAt({
      cadence: args.cadence,
      timeOfDayMinutes: args.timeOfDayMinutes,
      weekdays: allowed,
      afterTimestamp: args.firstRunAt,
    })
  }

  const targetDay = args.dayOfMonth ?? firstRunDate.day
  if (firstRunDate.day === targetDay && candidateMs >= args.firstRunAt) {
    return candidateMs
  }

  return computeNextRunAt({
    cadence: args.cadence,
    timeOfDayMinutes: args.timeOfDayMinutes,
    dayOfMonth: targetDay,
    afterTimestamp: args.firstRunAt,
  })
}

function atTimeOfDay(
  calendarDate: ReturnType<typeof toCalendarDate>,
  timeOfDayMinutes: number,
) {
  const hour = Math.floor(timeOfDayMinutes / 60)
  const minute = timeOfDayMinutes % 60
  return toZoned(calendarDate, PROGRAM_TIMEZONE).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  })
}

export function computeNextRunAt(args: {
  cadence: "daily" | "weekly" | "monthly"
  timeOfDayMinutes: number
  weekdays?: number[]
  dayOfMonth?: number
  afterTimestamp: number
}): number {
  const { cadence, timeOfDayMinutes, weekdays, dayOfMonth, afterTimestamp } =
    args
  let cursorDate = toCalendarDate(
    fromAbsolute(afterTimestamp, PROGRAM_TIMEZONE),
  )

  for (let attempt = 0; attempt < 500; attempt++) {
    const candidateZdt = atTimeOfDay(cursorDate, timeOfDayMinutes)
    const candidateMs = candidateZdt.toDate().getTime()

    if (candidateMs > afterTimestamp) {
      const weekday = getProgramWeekday(candidateMs)

      if (cadence === "daily") {
        return candidateMs
      }

      if (cadence === "weekly") {
        const allowed = weekdays ?? [weekday]
        if (allowed.includes(weekday)) {
          return candidateMs
        }
      }

      if (cadence === "monthly") {
        const targetDay = dayOfMonth ?? cursorDate.day
        if (cursorDate.day === targetDay) {
          return candidateMs
        }
      }
    }

    cursorDate = cursorDate.add({ days: 1 })
  }

  throw new Error("Could not compute next run time")
}

export function deriveDayOfMonth(nextRunAt: number): number {
  return toCalendarDate(fromAbsolute(nextRunAt, PROGRAM_TIMEZONE)).day
}
