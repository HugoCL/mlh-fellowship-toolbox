import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

export async function validateLeaderOneOnOneRefs(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  fellowId: Id<"fellows">,
  instanceId: Id<"oneOnOneInstances">,
): Promise<void> {
  const fellow = await ctx.db.get("fellows", fellowId)
  if (!fellow || fellow.cohortId !== cohortId) {
    throw new Error("Fellow not found")
  }

  const instance = await ctx.db.get("oneOnOneInstances", instanceId)
  if (!instance || instance.cohortId !== cohortId) {
    throw new Error("Leader 1:1 round not found")
  }
}

export async function getLeaderOneOnOneRecord(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  fellowId: Id<"fellows">,
  instanceId: Id<"oneOnOneInstances">,
): Promise<Doc<"leaderOneOnOnes"> | null> {
  return await ctx.db
    .query("leaderOneOnOnes")
    .withIndex("by_cohort_fellow_and_instance", (q) =>
      q
        .eq("cohortId", cohortId)
        .eq("fellowId", fellowId)
        .eq("instanceId", instanceId),
    )
    .unique()
}

export async function ensureLeaderRecordsForFellow(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  fellowId: Id<"fellows">,
): Promise<number> {
  const fellow = await ctx.db.get("fellows", fellowId)
  if (!fellow || fellow.cohortId !== cohortId) {
    return 0
  }

  const instances = await ctx.db
    .query("oneOnOneInstances")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  let created = 0
  const now = Date.now()

  for (const instance of instances) {
    const existing = await getLeaderOneOnOneRecord(
      ctx,
      cohortId,
      fellowId,
      instance._id,
    )
    if (existing) {
      continue
    }

    await ctx.db.insert("leaderOneOnOnes", {
      cohortId,
      fellowId,
      instanceId: instance._id,
      status: "notStarted",
      updatedAt: now,
    })
    created += 1
  }

  return created
}
