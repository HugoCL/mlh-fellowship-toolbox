import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { type CohortAccess, requireFellowForUser } from "./lib/auth"
import {
  canManagePodAsLeader,
  isUmbrellaCohort,
  parentHasChildPods,
} from "./lib/cohortScope"
import { cohortQuery, podManagementMutation } from "./lib/customFunctions"

const attendanceReportEntryValidator = v.object({
  name: v.string(),
  email: v.string(),
  presentCount: v.number(),
  lateCount: v.number(),
  excusedCount: v.number(),
  absentCount: v.number(),
  sessionCount: v.number(),
  absenceDates: v.array(v.string()),
  excusedDates: v.array(v.string()),
})

const attendanceReportValidator = v.object({
  sessions: v.array(v.string()),
  fellows: v.array(attendanceReportEntryValidator),
  sourceRowCount: v.number(),
  updatedAt: v.number(),
})

const attendanceReportInputValidator = v.object({
  name: v.string(),
  email: v.string(),
  presentCount: v.number(),
  lateCount: v.number(),
  excusedCount: v.number(),
  absentCount: v.number(),
  sessionCount: v.number(),
  absenceDates: v.array(v.string()),
  excusedDates: v.array(v.string()),
})

type ReportQueryCtx = QueryCtx & {
  membership: { role: "podLeader" | "fellow" | "mentor" }
  impersonationSession?: unknown
  cohortAccess: CohortAccess
}

async function canViewAllReports(
  ctx: ReportQueryCtx,
  cohortId: Id<"cohorts">,
): Promise<boolean> {
  if (ctx.impersonationSession) {
    return false
  }
  if (ctx.cohortAccess.kind === "umbrellaViewer") {
    return true
  }
  if (ctx.membership.role !== "podLeader") {
    return false
  }

  const cohort = ctx.cohortAccess.cohort
  const hasChildPods = isUmbrellaCohort(cohort)
    ? await parentHasChildPods(ctx, cohortId)
    : false
  return canManagePodAsLeader(cohort, hasChildPods)
}

export const getAttendanceReport = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(attendanceReportValidator, v.null()),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("attendanceReports")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .unique()

    if (!report) {
      return null
    }

    const publicReport = {
      sessions: report.sessions,
      fellows: report.fellows.map(
        ({
          name,
          email,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          sessionCount,
          absenceDates,
          excusedDates,
        }) => ({
          name,
          email,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          sessionCount,
          absenceDates,
          excusedDates,
        }),
      ),
      sourceRowCount: report.sourceRowCount,
      updatedAt: report.updatedAt,
    }

    if (await canViewAllReports(ctx, args.cohortId)) {
      return publicReport
    }

    if (ctx.membership.role !== "fellow") {
      throw new Error("Fellow access required")
    }

    const fellow = await requireFellowForUser(ctx, args.cohortId, ctx.user._id)
    const fellows = report.fellows
      .filter((entry) => entry.fellowId === fellow._id)
      .map(
        ({
          name,
          email,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          sessionCount,
          absenceDates,
          excusedDates,
        }) => ({
          name,
          email,
          presentCount,
          lateCount,
          excusedCount,
          absentCount,
          sessionCount,
          absenceDates,
          excusedDates,
        }),
      )

    return {
      ...publicReport,
      fellows,
      sourceRowCount: fellows.length,
    }
  },
})

export const saveAttendanceReport = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    sessions: v.array(v.string()),
    fellows: v.array(attendanceReportInputValidator),
    sourceRowCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      args.sessions.length === 0 ||
      args.sessions.length > 500 ||
      args.fellows.length > 5_000 ||
      !Number.isInteger(args.sourceRowCount) ||
      args.sourceRowCount < 0 ||
      args.sourceRowCount > 5_000
    ) {
      throw new Error("That attendance report is too large or invalid")
    }

    const sessions = Array.from(
      new Set(args.sessions.map((session) => session.trim()).filter(Boolean)),
    )
    if (sessions.length === 0) {
      throw new Error("That attendance report has no session dates")
    }

    const roster = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()
    const fellowByEmail = new Map(
      roster.map((fellow) => [fellow.email.trim().toLowerCase(), fellow]),
    )

    const entries = args.fellows.map((entry) => {
      const counts = [
        entry.presentCount,
        entry.lateCount,
        entry.excusedCount,
        entry.absentCount,
        entry.sessionCount,
      ]
      if (
        counts.some((count) => !Number.isInteger(count) || count < 0) ||
        entry.presentCount +
          entry.lateCount +
          entry.excusedCount +
          entry.absentCount !==
          entry.sessionCount ||
        entry.sessionCount > sessions.length ||
        entry.absenceDates.length > entry.sessionCount ||
        entry.excusedDates.length > entry.sessionCount
      ) {
        throw new Error("That attendance report has invalid fellow data")
      }

      const email = entry.email.trim().toLowerCase()
      const fellow = fellowByEmail.get(email)
      return {
        ...(fellow ? { fellowId: fellow._id } : {}),
        name: entry.name.trim(),
        email,
        presentCount: entry.presentCount,
        lateCount: entry.lateCount,
        excusedCount: entry.excusedCount,
        absentCount: entry.absentCount,
        sessionCount: entry.sessionCount,
        absenceDates: Array.from(
          new Set(
            entry.absenceDates.map((date) => date.trim()).filter(Boolean),
          ),
        ),
        excusedDates: Array.from(
          new Set(
            entry.excusedDates.map((date) => date.trim()).filter(Boolean),
          ),
        ),
      }
    })

    const value = {
      cohortId: args.cohortId,
      sessions,
      fellows: entries,
      sourceRowCount: args.sourceRowCount,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    }
    const existing = await ctx.db
      .query("attendanceReports")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .unique()

    if (existing) {
      await ctx.db.patch("attendanceReports", existing._id, value)
    } else {
      await ctx.db.insert("attendanceReports", value)
    }

    return null
  },
})
