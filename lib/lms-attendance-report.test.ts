import { describe, expect, it } from "vitest"
import {
  getAttendanceSummary,
  parseLmsAttendanceReportCsv,
  parseLmsAttendanceReportUpload,
} from "./lms-attendance-report"

const REPORT_TSV = [
  "Users\t\tSessions",
  "First name / Last name\tEmail address\tJun 15 10PM\tJun 17 10PM\tJun 19 10PM\tJun 22 10PM\tP\tL\tE\tA\tSessions\tPoints\tPercentage",
  "Jane Choi\tjane@example.com\tP (2/2)\tA (0/2)\tE (1/2)\t?\t1\t0\t1\t1\t3\t3 / 6\t50.0%",
  "Paul Contreras\tpaul@example.com\tP (2/2)\tP (2/2)\tP (2/2)\tL (1/2)\t3\t1\t0\t0\t4\t7 / 8\t87.5%",
].join("\n")

describe("parseLmsAttendanceReportCsv", () => {
  it("reads dated LMS sessions and ignores unmarked days", () => {
    const result = parseLmsAttendanceReportCsv(REPORT_TSV)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sessionNames).toEqual([
      "Jun 15",
      "Jun 17",
      "Jun 19",
      "Jun 22",
    ])
    expect(result.data.sourceRowCount).toBe(2)
    expect(result.data.fellows[0]).toEqual({
      name: "Jane Choi",
      email: "jane@example.com",
      presentCount: 1,
      lateCount: 0,
      excusedCount: 1,
      absentCount: 1,
      sessionCount: 3,
      absenceDates: ["Jun 17"],
      excusedDates: ["Jun 19"],
    })
  })

  it("rejects unsupported files and missing attendance headers", () => {
    expect(
      parseLmsAttendanceReportUpload({
        fileName: "attendance.json",
        content: REPORT_TSV,
      }).ok,
    ).toBe(false)
    expect(
      parseLmsAttendanceReportCsv("name,email,Jun 15\nJane,jane@example.com,P")
        .ok,
    ).toBe(false)
  })
})

describe("getAttendanceSummary", () => {
  it("removes excused sessions from the requirement denominator", () => {
    const result = parseLmsAttendanceReportCsv(REPORT_TSV)
    if (!result.ok) throw new Error("expected a valid report")

    expect(getAttendanceSummary(result.data.fellows[0])).toEqual({
      attendedSessionCount: 1,
      eligibleSessionCount: 2,
      percentage: 50,
      meetsRequirement: false,
    })
    expect(getAttendanceSummary(result.data.fellows[1])).toEqual({
      attendedSessionCount: 4,
      eligibleSessionCount: 4,
      percentage: 100,
      meetsRequirement: true,
    })
  })
})
