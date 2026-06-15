import {
  fromAbsolute,
  getDayOfWeek,
  parseDate,
  parseDateTime,
  toCalendarDate,
  toZoned,
} from "@internationalized/date"

export const PROGRAM_TIMEZONE = "America/New_York" as const
export const PROGRAM_TIMEZONE_LABEL = "ET"

const programDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PROGRAM_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
})

const programDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PROGRAM_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "shortGeneric",
})

function calendarDateFromTimestamp(timestamp: number) {
  return toCalendarDate(fromAbsolute(timestamp, PROGRAM_TIMEZONE))
}

function isUtcMidnight(timestamp: number): boolean {
  const zdt = fromAbsolute(timestamp, "UTC")
  return (
    zdt.hour === 0 &&
    zdt.minute === 0 &&
    zdt.second === 0 &&
    zdt.millisecond === 0
  )
}

function isProgramEtMidnight(timestamp: number): boolean {
  const zdt = fromAbsolute(timestamp, PROGRAM_TIMEZONE)
  return (
    zdt.hour === 0 &&
    zdt.minute === 0 &&
    zdt.second === 0 &&
    zdt.millisecond === 0
  )
}

/** Infer the intended yyyy-MM-dd and re-store as midnight Eastern. */
export function normalizeProgramCalendarDateTimestamp(timestamp: number): {
  normalized: number
  changed: boolean
} {
  if (isProgramEtMidnight(timestamp)) {
    return { normalized: timestamp, changed: false }
  }

  const dateString = isUtcMidnight(timestamp)
    ? toCalendarDate(fromAbsolute(timestamp, "UTC")).toString()
    : toProgramDateInputValue(timestamp)

  const normalized = parseProgramDate(dateString)
  return { normalized, changed: normalized !== timestamp }
}

/** Parse a yyyy-MM-dd value as midnight in the program timezone. */
export function parseProgramDate(dateString: string): number {
  return toZoned(parseDate(dateString), PROGRAM_TIMEZONE).toDate().getTime()
}

/** @deprecated Use parseProgramDate */
export const toTimestamp = parseProgramDate

export function toProgramDateInputValue(timestamp: number): string {
  return calendarDateFromTimestamp(timestamp).toString()
}

/** @deprecated Use toProgramDateInputValue */
export const toDateInputValue = toProgramDateInputValue

export function formatProgramDate(timestamp: number): string {
  return programDateFormatter.format(new Date(timestamp))
}

/** @deprecated Use formatProgramDate */
export const formatDate = formatProgramDate

export function formatProgramDateTime(timestamp: number): string {
  return programDateTimeFormatter.format(new Date(timestamp))
}

/** @deprecated Use formatProgramDateTime */
export const formatDateTime = formatProgramDateTime

export function getProgramWeekday(
  timestamp: number,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return getDayOfWeek(calendarDateFromTimestamp(timestamp), "en-US", "sun") as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
}

export function isSameProgramCalendarDay(a: number, b: number): boolean {
  return toProgramDateInputValue(a) === toProgramDateInputValue(b)
}

export function toProgramDateTimeInputValue(timestamp: number): string {
  const zdt = fromAbsolute(timestamp, PROGRAM_TIMEZONE)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${zdt.year}-${pad(zdt.month)}-${pad(zdt.day)}T${pad(zdt.hour)}:${pad(zdt.minute)}`
}

/** @deprecated Use toProgramDateTimeInputValue */
export const toDateTimeLocalValue = toProgramDateTimeInputValue

export function programDateTimeInputToTimestamp(value: string): number {
  const normalized = value.length === 16 ? `${value}:00` : value
  return toZoned(parseDateTime(normalized), PROGRAM_TIMEZONE).toDate().getTime()
}

/** @deprecated Use programDateTimeInputToTimestamp */
export const dateTimeLocalToTimestamp = programDateTimeInputToTimestamp

export function formatWeekLabel(timestamp: number): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIMEZONE,
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp))
  return `Week of ${formatted}`
}

export function getWeekEnd(weekStart: number): number {
  const end = calendarDateFromTimestamp(weekStart).add({ days: 6 })
  return toZoned(end, PROGRAM_TIMEZONE).toDate().getTime()
}

export function formatWeekDateRange(weekStart: number): string {
  return `${formatProgramDate(weekStart)} – ${formatProgramDate(getWeekEnd(weekStart))}`
}
