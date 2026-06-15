import { describe, expect, it } from "vitest"
import { getProgramWeeks, isSameCalendarDay, MS_PER_WEEK } from "./programWeeks"
import { toTimestamp } from "./dates"

describe("getProgramWeeks", () => {
  it("returns one week when start and end are the same day", () => {
    const start = toTimestamp("2024-06-03")
    const weeks = getProgramWeeks(start, start)
    expect(weeks).toHaveLength(1)
    expect(weeks[0]?.weekLabel).toBe("Week 1")
    expect(weeks[0]?.weekStart).toBe(start)
  })

  it("returns consecutive weeks through the program end date", () => {
    const start = toTimestamp("2024-06-03")
    const end = start + 2 * MS_PER_WEEK
    const weeks = getProgramWeeks(start, end)
    expect(weeks).toHaveLength(3)
    expect(weeks.map((week) => week.weekNumber)).toEqual([1, 2, 3])
    expect(weeks[2]?.weekStart).toBe(start + 2 * MS_PER_WEEK)
  })

  it("returns an empty list when end is before start", () => {
    expect(getProgramWeeks(100, 50)).toEqual([])
  })
})

describe("isSameCalendarDay", () => {
  it("matches timestamps on the same local calendar day", () => {
    const morning = new Date("2024-06-15T09:00:00").getTime()
    const evening = new Date("2024-06-15T21:00:00").getTime()
    expect(isSameCalendarDay(morning, evening)).toBe(true)
  })

  it("does not match different calendar days", () => {
    const dayOne = toTimestamp("2024-06-15")
    const dayTwo = toTimestamp("2024-06-16")
    expect(isSameCalendarDay(dayOne, dayTwo)).toBe(false)
  })
})
