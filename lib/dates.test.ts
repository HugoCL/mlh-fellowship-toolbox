import { parseISO } from "date-fns"
import { describe, expect, it } from "vitest"
import {
  formatDate,
  formatWeekLabel,
  toDateInputValue,
  toTimestamp,
} from "./dates"

describe("toTimestamp", () => {
  it("parses ISO date strings", () => {
    expect(toTimestamp("2024-06-15")).toBe(parseISO("2024-06-15").getTime())
  })
})

describe("toDateInputValue", () => {
  it("round-trips with toTimestamp for calendar dates", () => {
    const dateString = "2024-06-15"
    expect(toDateInputValue(toTimestamp(dateString))).toBe(dateString)
  })
})

describe("formatWeekLabel", () => {
  it("prefixes the formatted date with Week of", () => {
    const label = formatWeekLabel(toTimestamp("2024-06-15"))
    expect(label).toMatch(/^Week of /)
    expect(label).toContain("June")
    expect(label).toContain("15")
  })
})

describe("formatDate", () => {
  it("returns a non-empty localized date string", () => {
    const formatted = formatDate(toTimestamp("2024-06-15"))
    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toMatch(/2024/)
  })
})
