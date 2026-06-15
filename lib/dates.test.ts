import { parseDate, toZoned } from "@internationalized/date"
import { describe, expect, it } from "vitest"
import {
  formatDate,
  formatDateTime,
  formatWeekDateRange,
  formatWeekLabel,
  getWeekEnd,
  normalizeProgramCalendarDateTimestamp,
  PROGRAM_TIMEZONE,
  parseProgramDate,
  programDateTimeInputToTimestamp,
  toDateInputValue,
  toProgramDateTimeInputValue,
  toTimestamp,
} from "./dates"

describe("parseProgramDate", () => {
  it("interprets yyyy-MM-dd as midnight Eastern", () => {
    const timestamp = parseProgramDate("2024-06-15")
    expect(toDateInputValue(timestamp)).toBe("2024-06-15")
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: PROGRAM_TIMEZONE,
        dateStyle: "medium",
      }).format(timestamp),
    ).toBe("Jun 15, 2024")
  })

  it("matches the legacy toTimestamp alias", () => {
    expect(toTimestamp("2024-06-15")).toBe(parseProgramDate("2024-06-15"))
  })
})

describe("toDateInputValue", () => {
  it("round-trips with parseProgramDate for calendar dates", () => {
    const dateString = "2024-06-15"
    expect(toDateInputValue(parseProgramDate(dateString))).toBe(dateString)
  })
})

describe("program datetime helpers", () => {
  it("round-trips datetime-local values in Eastern time", () => {
    const input = "2024-06-15T23:59"
    const timestamp = programDateTimeInputToTimestamp(input)
    expect(toProgramDateTimeInputValue(timestamp)).toBe(input)
  })

  it("formats datetimes with an Eastern zone label", () => {
    const timestamp = programDateTimeInputToTimestamp("2024-06-15T23:59")
    expect(formatDateTime(timestamp)).toMatch(/ET|EDT|EST/)
  })
})

describe("formatWeekLabel", () => {
  it("prefixes the formatted date with Week of", () => {
    const label = formatWeekLabel(parseProgramDate("2024-06-15"))
    expect(label).toMatch(/^Week of /)
    expect(label).toContain("June")
    expect(label).toContain("15")
  })
})

describe("formatDate", () => {
  it("returns a non-empty Eastern calendar date string", () => {
    const formatted = formatDate(parseProgramDate("2024-06-15"))
    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toMatch(/2024/)
    expect(formatted).toMatch(/Jun/)
  })
})

describe("formatWeekDateRange", () => {
  it("formats a seven-day range from the week start", () => {
    const weekStart = parseProgramDate("2024-06-03")
    const range = formatWeekDateRange(weekStart)
    expect(range).toContain(formatDate(weekStart))
    expect(range).toContain(formatDate(getWeekEnd(weekStart)))
    expect(range).toContain("–")
  })
})

describe("normalizeProgramCalendarDateTimestamp", () => {
  it("converts UTC-midnight date-only storage to Eastern midnight", () => {
    const legacyUtcMidnight = Date.parse("2024-06-15T00:00:00.000Z")
    const { normalized, changed } =
      normalizeProgramCalendarDateTimestamp(legacyUtcMidnight)

    expect(changed).toBe(true)
    expect(toDateInputValue(normalized)).toBe("2024-06-15")
    expect(formatDate(normalized)).toMatch(/Jun 15, 2024/)
  })

  it("leaves Eastern-midnight timestamps unchanged", () => {
    const timestamp = parseProgramDate("2024-06-15")
    const { normalized, changed } =
      normalizeProgramCalendarDateTimestamp(timestamp)

    expect(changed).toBe(false)
    expect(normalized).toBe(timestamp)
  })
})

describe("timezone consistency", () => {
  it("stores the same calendar day regardless of runtime timezone", () => {
    const easternMidnight = toZoned(parseDate("2024-06-15"), PROGRAM_TIMEZONE)
      .toDate()
      .getTime()
    expect(toDateInputValue(easternMidnight)).toBe("2024-06-15")
    expect(formatDate(easternMidnight)).toMatch(/Jun 15, 2024/)
  })
})
