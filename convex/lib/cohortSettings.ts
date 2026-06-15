import type { Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

type CohortStatus = Doc<"cohorts">["status"]

export type CohortSettingsPatch = {
  name?: string
  startDate?: number
  endDate?: number
  status?: CohortStatus
}

export function validateCohortSettingsPatch(
  patch: CohortSettingsPatch,
): Partial<Pick<Doc<"cohorts">, "name" | "startDate" | "endDate" | "status">> {
  const updates: Partial<
    Pick<Doc<"cohorts">, "name" | "startDate" | "endDate" | "status">
  > = {}

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) {
      throw new Error("Name cannot be empty")
    }
    updates.name = trimmed
  }

  if (patch.startDate !== undefined) {
    updates.startDate = patch.startDate
  }

  if (patch.endDate !== undefined) {
    updates.endDate = patch.endDate
  }

  if (patch.status !== undefined) {
    updates.status = patch.status
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No changes to save")
  }

  return updates
}

export function assertValidDateRange(
  cohort: Doc<"cohorts">,
  updates: Partial<Pick<Doc<"cohorts">, "startDate" | "endDate">>,
): void {
  const startDate = updates.startDate ?? cohort.startDate
  const endDate = updates.endDate ?? cohort.endDate

  if (endDate < startDate) {
    throw new Error("End date must be on or after the start date")
  }
}

export async function applyCohortSettingsUpdate(
  ctx: MutationCtx,
  cohort: Doc<"cohorts">,
  patch: CohortSettingsPatch,
): Promise<void> {
  const updates = validateCohortSettingsPatch(patch)
  assertValidDateRange(cohort, updates)
  await ctx.db.patch("cohorts", cohort._id, updates)
}
