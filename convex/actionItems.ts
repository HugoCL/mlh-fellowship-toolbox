import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import {
  getTargetCount,
  getTargetedFellows,
  isFellowTargeted,
  validateActionItemFields,
} from "./lib/actionItemsHelpers"
import { getFellowForUser, requireFellowForUser } from "./lib/auth"
import {
  canManagePodAsLeader,
  isUmbrellaCohort,
  parentHasChildPods,
} from "./lib/cohortScope"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { fellowValidator } from "./lib/validators"

const actionItemValidator = v.object({
  _id: v.id("actionItems"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  title: v.string(),
  message: v.string(),
  linkUrl: v.optional(v.string()),
  dueAt: v.number(),
  targetAllFellows: v.boolean(),
  targetFellowIds: v.optional(v.array(v.id("fellows"))),
  createdByUserId: v.id("users"),
  createdAt: v.number(),
})

const actionItemCompletionValidator = v.object({
  _id: v.id("actionItemCompletions"),
  _creationTime: v.number(),
  actionItemId: v.id("actionItems"),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  completedAt: v.number(),
  updatedByUserId: v.id("users"),
})

const fellowOpenItemValidator = v.object({
  item: actionItemValidator,
  isOverdue: v.boolean(),
})

const fellowCompletedItemValidator = v.object({
  item: actionItemValidator,
  completedAt: v.number(),
})

const leaderFellowStatusValidator = v.object({
  fellowId: v.id("fellows"),
  name: v.string(),
  completed: v.boolean(),
  completedAt: v.optional(v.number()),
})

const leaderItemValidator = v.object({
  item: actionItemValidator,
  completedCount: v.number(),
  targetCount: v.number(),
  fellowStatuses: v.array(leaderFellowStatusValidator),
})

async function canShowLeaderView(
  ctx: QueryCtx & {
    membership: { role: string }
    impersonationSession: unknown
    cohortAccess: { kind: string }
    cohortId: Id<"cohorts">
  },
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
  const cohort = await ctx.db.get("cohorts", ctx.cohortId)
  if (!cohort) {
    return false
  }
  const hasChildPods = isUmbrellaCohort(cohort)
    ? await parentHasChildPods(ctx, ctx.cohortId)
    : false
  return canManagePodAsLeader(cohort, hasChildPods)
}

async function validateTargetFellows(
  ctx: QueryCtx,
  cohortId: Id<"cohorts">,
  targetAllFellows: boolean,
  targetFellowIds: Id<"fellows">[] | undefined,
): Promise<void> {
  if (targetAllFellows) {
    return
  }
  if (!targetFellowIds || targetFellowIds.length === 0) {
    throw new Error("Select at least one fellow")
  }
  for (const fellowId of targetFellowIds) {
    const fellow = await ctx.db.get("fellows", fellowId)
    if (!fellow || fellow.cohortId !== cohortId) {
      throw new Error("One or more selected fellows are invalid")
    }
  }
}

export const listActionItems = cohortQuery({
  args: {
    cohortId: v.id("cohorts"),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      view: v.literal("leader"),
      fellows: v.array(fellowValidator),
      items: v.array(leaderItemValidator),
    }),
    v.object({
      view: v.literal("fellow"),
      openItems: v.array(fellowOpenItemValidator),
      completedItems: v.array(fellowCompletedItemValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const actionItems = await ctx.db
      .query("actionItems")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const sortedItems = actionItems.sort((a, b) => a.dueAt - b.dueAt)

    const showLeaderView = await canShowLeaderView(ctx)

    if (showLeaderView) {
      const allCompletions = await Promise.all(
        sortedItems.map(async (item) => {
          const completions = await ctx.db
            .query("actionItemCompletions")
            .withIndex("by_action_item", (q) => q.eq("actionItemId", item._id))
            .collect()
          return { item, completions }
        }),
      )

      return {
        view: "leader" as const,
        fellows,
        items: allCompletions.map(({ item, completions }) => {
          const completionByFellowId = new Map(
            completions.map((entry) => [entry.fellowId, entry]),
          )
          const targetedFellows = getTargetedFellows(item, fellows)
          const fellowStatuses = targetedFellows
            .map((fellow) => {
              const completion = completionByFellowId.get(fellow._id)
              return {
                fellowId: fellow._id,
                name: fellow.name,
                completed: completion !== undefined,
                completedAt: completion?.completedAt,
              }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

          const completedCount = fellowStatuses.filter(
            (status) => status.completed,
          ).length

          return {
            item,
            completedCount,
            targetCount: getTargetCount(item, fellows.length),
            fellowStatuses,
          }
        }),
      }
    }

    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return {
        view: "fellow" as const,
        openItems: [],
        completedItems: [],
      }
    }

    const myCompletions = await ctx.db
      .query("actionItemCompletions")
      .withIndex("by_cohort_and_fellow", (q) =>
        q.eq("cohortId", args.cohortId).eq("fellowId", fellow._id),
      )
      .collect()

    const completionByItemId = new Map(
      myCompletions.map((entry) => [entry.actionItemId, entry]),
    )

    const targetedItems = sortedItems.filter((item) =>
      isFellowTargeted(item, fellow._id),
    )

    const openItems: Array<{
      item: Doc<"actionItems">
      isOverdue: boolean
    }> = []
    const completedItems: Array<{
      item: Doc<"actionItems">
      completedAt: number
    }> = []

    for (const item of targetedItems) {
      const completion = completionByItemId.get(item._id)
      if (completion) {
        completedItems.push({
          item,
          completedAt: completion.completedAt,
        })
      } else {
        openItems.push({
          item,
          isOverdue: item.dueAt < args.now,
        })
      }
    }

    return {
      view: "fellow" as const,
      openItems,
      completedItems,
    }
  },
})

export const createActionItem = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    dueAt: v.number(),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
  },
  returns: actionItemValidator,
  handler: async (ctx, args) => {
    validateActionItemFields({
      title: args.title,
      message: args.message,
      dueAt: args.dueAt,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetFellowIds,
      requireFutureDueAt: true,
    })
    await validateTargetFellows(
      ctx,
      args.cohortId,
      args.targetAllFellows,
      args.targetFellowIds,
    )

    const linkUrl = args.linkUrl?.trim() || undefined

    const actionItemId = await ctx.db.insert("actionItems", {
      cohortId: args.cohortId,
      title: args.title.trim(),
      message: args.message.trim(),
      linkUrl,
      dueAt: args.dueAt,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetAllFellows ? undefined : args.targetFellowIds,
      createdByUserId: ctx.user._id,
      createdAt: Date.now(),
    })

    const created = await ctx.db.get("actionItems", actionItemId)
    if (!created) {
      throw new Error("Action item not found")
    }
    return created
  },
})

export const updateActionItem = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    actionItemId: v.id("actionItems"),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    dueAt: v.number(),
    targetAllFellows: v.boolean(),
    targetFellowIds: v.optional(v.array(v.id("fellows"))),
  },
  returns: actionItemValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("actionItems", args.actionItemId)
    if (!existing || existing.cohortId !== args.cohortId) {
      throw new Error("Action item not found")
    }

    validateActionItemFields({
      title: args.title,
      message: args.message,
      dueAt: args.dueAt,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetFellowIds,
    })
    await validateTargetFellows(
      ctx,
      args.cohortId,
      args.targetAllFellows,
      args.targetFellowIds,
    )

    const linkUrl = args.linkUrl?.trim() || undefined

    await ctx.db.patch("actionItems", args.actionItemId, {
      title: args.title.trim(),
      message: args.message.trim(),
      linkUrl,
      dueAt: args.dueAt,
      targetAllFellows: args.targetAllFellows,
      targetFellowIds: args.targetAllFellows ? undefined : args.targetFellowIds,
    })

    const updated = await ctx.db.get("actionItems", args.actionItemId)
    if (!updated) {
      throw new Error("Action item not found")
    }
    return updated
  },
})

export const deleteActionItem = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    actionItemId: v.id("actionItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("actionItems", args.actionItemId)
    if (!existing || existing.cohortId !== args.cohortId) {
      throw new Error("Action item not found")
    }

    const completions = await ctx.db
      .query("actionItemCompletions")
      .withIndex("by_action_item", (q) =>
        q.eq("actionItemId", args.actionItemId),
      )
      .collect()

    for (const completion of completions) {
      await ctx.db.delete("actionItemCompletions", completion._id)
    }

    await ctx.db.delete("actionItems", args.actionItemId)
    return null
  },
})

export const setCompletion = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    actionItemId: v.id("actionItems"),
    completed: v.boolean(),
  },
  returns: v.union(actionItemCompletionValidator, v.null()),
  handler: async (ctx, args) => {
    const actionItem = await ctx.db.get("actionItems", args.actionItemId)
    if (!actionItem || actionItem.cohortId !== args.cohortId) {
      throw new Error("Action item not found")
    }

    const fellow = await requireFellowForUser(ctx, args.cohortId, ctx.user._id)

    if (!isFellowTargeted(actionItem, fellow._id)) {
      throw new Error("This action item is not assigned to you")
    }

    const existing = await ctx.db
      .query("actionItemCompletions")
      .withIndex("by_action_item_and_fellow", (q) =>
        q.eq("actionItemId", args.actionItemId).eq("fellowId", fellow._id),
      )
      .unique()

    if (args.completed) {
      if (existing) {
        return existing
      }

      const completionId = await ctx.db.insert("actionItemCompletions", {
        actionItemId: args.actionItemId,
        cohortId: args.cohortId,
        fellowId: fellow._id,
        completedAt: Date.now(),
        updatedByUserId: ctx.user._id,
      })

      const created = await ctx.db.get("actionItemCompletions", completionId)
      if (!created) {
        throw new Error("Completion not found")
      }
      return created
    }

    if (existing) {
      await ctx.db.delete("actionItemCompletions", existing._id)
    }
    return null
  },
})
