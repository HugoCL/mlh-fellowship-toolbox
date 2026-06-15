import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { normalizeProgramCalendarDateTimestamp } from "./dates"

export type MigrateProgramDatesResult = {
  cohortsUpdated: number
  demoDaysUpdated: number
  lightningTalkSlotsUpdated: number
  mentorMeetingRoundsUpdated: number
  fieldsAlreadyNormalized: number
}

function emptyResult(): MigrateProgramDatesResult {
  return {
    cohortsUpdated: 0,
    demoDaysUpdated: 0,
    lightningTalkSlotsUpdated: 0,
    mentorMeetingRoundsUpdated: 0,
    fieldsAlreadyNormalized: 0,
  }
}

export async function migrateProgramDatesForCohorts(
  ctx: MutationCtx,
  cohortIds: Id<"cohorts">[],
): Promise<MigrateProgramDatesResult> {
  const result = emptyResult()

  for (const cohortId of cohortIds) {
    const cohort = await ctx.db.get("cohorts", cohortId)
    if (!cohort) {
      continue
    }

    let cohortChanged = false
    const cohortPatch: { startDate?: number; endDate?: number } = {}

    for (const field of ["startDate", "endDate"] as const) {
      const { normalized, changed } = normalizeProgramCalendarDateTimestamp(
        cohort[field],
      )
      if (changed) {
        cohortPatch[field] = normalized
        cohortChanged = true
      } else {
        result.fieldsAlreadyNormalized += 1
      }
    }

    if (cohortChanged) {
      await ctx.db.patch("cohorts", cohortId, cohortPatch)
      result.cohortsUpdated += 1
    }

    const demoDays = await ctx.db
      .query("demoDays")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect()

    for (const demoDay of demoDays) {
      const { normalized, changed } = normalizeProgramCalendarDateTimestamp(
        demoDay.demoDate,
      )
      if (changed) {
        await ctx.db.patch("demoDays", demoDay._id, { demoDate: normalized })
        result.demoDaysUpdated += 1
      } else {
        result.fieldsAlreadyNormalized += 1
      }
    }

    const slots = await ctx.db
      .query("lightningTalkSlots")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect()

    for (const slot of slots) {
      const { normalized, changed } = normalizeProgramCalendarDateTimestamp(
        slot.slotDate,
      )
      if (changed) {
        await ctx.db.patch("lightningTalkSlots", slot._id, {
          slotDate: normalized,
        })
        result.lightningTalkSlotsUpdated += 1
      } else {
        result.fieldsAlreadyNormalized += 1
      }
    }

    const rounds = await ctx.db
      .query("mentorMeetingRounds")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect()

    for (const round of rounds) {
      const { normalized, changed } = normalizeProgramCalendarDateTimestamp(
        round.targetWeekStart,
      )
      if (changed) {
        await ctx.db.patch("mentorMeetingRounds", round._id, {
          targetWeekStart: normalized,
        })
        result.mentorMeetingRoundsUpdated += 1
      } else {
        result.fieldsAlreadyNormalized += 1
      }
    }
  }

  return result
}
