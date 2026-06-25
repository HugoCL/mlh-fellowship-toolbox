import { describe, expect, it } from "vitest"
import {
  alignFirstRunAt,
  computeNextRunAt,
} from "../convex/lib/notificationHelpers"
import {
  programDateTimeInputToTimestamp,
  toProgramDateTimeInputValue,
} from "./dates"

describe("computeNextRunAt", () => {
  it("returns the next daily occurrence after the anchor", () => {
    const after = programDateTimeInputToTimestamp("2026-06-16T08:00")
    const next = computeNextRunAt({
      cadence: "daily",
      timeOfDayMinutes: 9 * 60,
      afterTimestamp: after,
    })

    expect(toProgramDateTimeInputValue(next)).toBe("2026-06-16T09:00")
  })

  it("returns the next weekly occurrence on selected weekdays", () => {
    const after = programDateTimeInputToTimestamp("2026-06-16T08:00")
    const next = computeNextRunAt({
      cadence: "weekly",
      timeOfDayMinutes: 9 * 60,
      weekdays: [1],
      afterTimestamp: after,
    })

    expect(toProgramDateTimeInputValue(next)).toBe("2026-06-22T09:00")
  })

  it("aligns first daily run to the configured time on the same day", () => {
    const firstRunAt = programDateTimeInputToTimestamp("2026-06-16T08:00")
    const aligned = alignFirstRunAt({
      cadence: "daily",
      timeOfDayMinutes: 9 * 60,
      firstRunAt,
    })

    expect(toProgramDateTimeInputValue(aligned)).toBe("2026-06-16T09:00")
  })

  it("advances missed recurring runs from now instead of one interval at a time", () => {
    const missedRunAt = programDateTimeInputToTimestamp("2026-06-01T09:00")
    const now = programDateTimeInputToTimestamp("2026-06-16T10:00")
    const next = computeNextRunAt({
      cadence: "daily",
      timeOfDayMinutes: 9 * 60,
      afterTimestamp: now,
    })

    expect(missedRunAt).toBeLessThan(now)
    expect(toProgramDateTimeInputValue(next)).toBe("2026-06-17T09:00")
  })

  it("returns the next monthly occurrence on the configured day", () => {
    const after = programDateTimeInputToTimestamp("2026-06-16T10:00")
    const next = computeNextRunAt({
      cadence: "monthly",
      timeOfDayMinutes: 9 * 60,
      dayOfMonth: 15,
      afterTimestamp: after,
    })

    expect(toProgramDateTimeInputValue(next)).toBe("2026-07-15T09:00")
  })
})
