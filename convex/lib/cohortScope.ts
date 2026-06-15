import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type Ctx = QueryCtx | MutationCtx

export async function parentHasChildPods(
  ctx: Ctx,
  parentCohortId: Id<"cohorts">,
): Promise<boolean> {
  const child = await ctx.db
    .query("cohorts")
    .withIndex("by_parent", (q) => q.eq("parentCohortId", parentCohortId))
    .first()

  return child !== null
}

export function canManagePodAsLeader(
  cohort: Doc<"cohorts">,
  hasChildPods: boolean,
): boolean {
  if (cohort.parentCohortId !== undefined) {
    return true
  }

  // Legacy / bootstrap: sole umbrella with no pods yet — admin runs roster here
  return !hasChildPods
}

export function isUmbrellaCohort(cohort: Doc<"cohorts">): boolean {
  return cohort.parentCohortId === undefined
}
