import { describe, expect, it } from "vitest"
import { getStatusLabel, type OneOnOneStatus } from "./status"

describe("getStatusLabel", () => {
  const cases: Array<[OneOnOneStatus, string]> = [
    ["notStarted", "Not yet"],
    ["scheduled", "Scheduled"],
    ["completed", "Completed"],
  ]

  for (const [status, label] of cases) {
    it(`maps ${status} to ${label}`, () => {
      expect(getStatusLabel(status)).toBe(label)
    })
  }
})
