import { describe, expect, it } from "vitest"
import {
  filterProgressFellowsByTasks,
  parseLmsProgressReportCsv,
  parseLmsProgressReportUpload,
  sortProgressFellows,
} from "./lms-progress-report"

const REPORT_CSV = [
  '\uFEFFFirst name / Last name,Email address,Module 1: Intro,Task 1: GitHub,"Task 2: Build &amp; Ship"',
  '"Jane Choi",jane@example.com,Completed,Completed Tuesday,Completed Tuesday',
  '"Paul, Contreras",paul@example.com,Completed,Not completed,Completed Tuesday',
  '"Sage Ebert",sage@example.com,Completed,"Not completed","Not completed"',
].join("\n")

describe("parseLmsProgressReportCsv", () => {
  it("keeps only fellows with unsubmitted Task columns", () => {
    const result = parseLmsProgressReportCsv(REPORT_CSV)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.taskCount).toBe(2)
    expect(result.data.taskNames).toEqual([
      "Task 1: GitHub",
      "Task 2: Build & Ship",
    ])
    expect(result.data.sourceRowCount).toBe(3)
    expect(result.data.fellows).toEqual([
      {
        name: "Paul, Contreras",
        email: "paul@example.com",
        pendingTasks: ["Task 1: GitHub"],
      },
      {
        name: "Sage Ebert",
        email: "sage@example.com",
        pendingTasks: ["Task 1: GitHub", "Task 2: Build & Ship"],
      },
    ])
  })

  it("rejects unsupported uploads and missing headers", () => {
    const upload = parseLmsProgressReportUpload({
      fileName: "progress.json",
      content: REPORT_CSV,
    })
    expect(upload.ok).toBe(false)

    const missingHeader = parseLmsProgressReportCsv(
      "name,email,Task 1: Test\nJane,jane@example.com,",
    )
    expect(missingHeader.ok).toBe(false)
  })
})

describe("filterProgressFellowsByTasks", () => {
  it("removes excluded columns from every fellow", () => {
    const result = parseLmsProgressReportCsv(REPORT_CSV)
    if (!result.ok) throw new Error("expected a valid report")

    expect(
      filterProgressFellowsByTasks(
        result.data.fellows,
        new Set(["Task 1: GitHub"]),
      ),
    ).toEqual([
      {
        name: "Sage Ebert",
        email: "sage@example.com",
        pendingTasks: ["Task 2: Build & Ship"],
      },
    ])
  })
})

describe("sortProgressFellows", () => {
  it("sorts by pending task count and uses name as the tie breaker", () => {
    const result = parseLmsProgressReportCsv(REPORT_CSV)
    if (!result.ok) throw new Error("expected a valid report")

    expect(
      sortProgressFellows(result.data.fellows, "pending").map(
        (fellow) => fellow.name,
      ),
    ).toEqual(["Sage Ebert", "Paul, Contreras"])
  })
})
