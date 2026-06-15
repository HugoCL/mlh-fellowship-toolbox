import { fromAbsolute, toCalendarDate, toZoned } from "@internationalized/date"
import { v } from "convex/values"
import {
  getProgramWeekday,
  isSameProgramCalendarDay,
  PROGRAM_TIMEZONE,
} from "./dates"

export const MS_PER_DAY = 24 * 60 * 60 * 1000
export const MS_PER_WEEK = 7 * MS_PER_DAY

export const weekdayValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
)

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ProgramWeek = {
  weekNumber: number
  weekStart: number
  weekLabel: string
}

export function getProgramWeeks(
  startDate: number,
  endDate: number,
): ProgramWeek[] {
  if (endDate < startDate) {
    return []
  }

  const weeks: ProgramWeek[] = []
  let weekStart = startDate
  let weekNumber = 1

  while (weekStart <= endDate) {
    weeks.push({
      weekNumber,
      weekStart,
      weekLabel: `Week ${weekNumber}`,
    })
    const nextStart = toCalendarDate(
      fromAbsolute(weekStart, PROGRAM_TIMEZONE),
    ).add({ days: 7 })
    weekStart = toZoned(nextStart, PROGRAM_TIMEZONE).toDate().getTime()
    weekNumber += 1
  }

  return weeks
}

/** Calendar weekday (0 = Sunday) within a program week block starting at `weekStart`. */
export function getSlotDateInProgramWeek(
  weekStart: number,
  dayOfWeek: Weekday,
): number {
  const startCal = toCalendarDate(fromAbsolute(weekStart, PROGRAM_TIMEZONE))
  const startDay = getProgramWeekday(weekStart)
  const offset = (dayOfWeek - startDay + 7) % 7
  const slotCal = startCal.add({ days: offset })
  return toZoned(slotCal, PROGRAM_TIMEZONE).toDate().getTime()
}

export function isSameCalendarDay(a: number, b: number): boolean {
  return isSameProgramCalendarDay(a, b)
}
