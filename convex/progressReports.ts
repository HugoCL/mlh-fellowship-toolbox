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

const progressReportEntryValidator = v.object({
  name: v.string(),
  email: v.string(),
  pendingTasks: v.array(v.string()),
})

const progressReportValidator = v.object({
  taskNames: v.array(v.string()),
  fellows: v.array(progressReportEntryValidator),
  sourceRowCount: v.number(),
  updatedAt: v.number(),
})

const progressReportInputValidator = v.object({
  name: v.string(),
  email: v.string(),
  pendingTasks: v.array(v.string()),
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

export const getProgressReport = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(progressReportValidator, v.null()),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("progressReports")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .unique()

    if (!report) {
      return null
    }

    const publicReport = {
      taskNames: report.taskNames,
      fellows: report.fellows.map(({ name, email, pendingTasks }) => ({
        name,
        email,
        pendingTasks,
      })),
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
      .map(({ name, email, pendingTasks }) => ({
        name,
        email,
        pendingTasks,
      }))
    return {
      ...publicReport,
      fellows,
      sourceRowCount: fellows.length,
    }
  },
})

export const saveProgressReport = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    taskNames: v.array(v.string()),
    fellows: v.array(progressReportInputValidator),
    sourceRowCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      args.taskNames.length > 200 ||
      args.fellows.length > 500 ||
      !Number.isInteger(args.sourceRowCount) ||
      args.sourceRowCount < 0 ||
      args.sourceRowCount > 5_000 ||
      args.fellows.reduce(
        (total, fellow) => total + fellow.pendingTasks.length,
        0,
      ) > 20_000
    ) {
      throw new Error("That progress report is too large or invalid")
    }

    const normalizedTaskNames = args.taskNames.map((task) => task.trim())
    if (
      normalizedTaskNames.some((task) => !/^Task(?:\s+\d+)?\s*:/i.test(task))
    ) {
      throw new Error("Only Task: columns can be saved in that report")
    }
    const taskNames = Array.from(new Set(normalizedTaskNames))

    const taskNameSet = new Set(taskNames)
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()
    const fellowByEmail = new Map(
      fellows.map((fellow) => [fellow.email.trim().toLowerCase(), fellow]),
    )

    const entries = args.fellows.flatMap((entry) => {
      const pendingTasks = Array.from(
        new Set(
          entry.pendingTasks
            .map((task) => task.trim())
            .filter((task) => taskNameSet.has(task)),
        ),
      )
      if (pendingTasks.length === 0) {
        return []
      }

      const email = entry.email.trim().toLowerCase()
      const fellow = fellowByEmail.get(email)
      return [
        {
          ...(fellow ? { fellowId: fellow._id } : {}),
          name: entry.name.trim(),
          email,
          pendingTasks,
        },
      ]
    })

    const value = {
      cohortId: args.cohortId,
      taskNames,
      fellows: entries,
      sourceRowCount: args.sourceRowCount,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    }
    const existing = await ctx.db
      .query("progressReports")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .unique()

    if (existing) {
      await ctx.db.patch("progressReports", existing._id, value)
    } else {
      await ctx.db.insert("progressReports", value)
    }

    return null
  },
})
