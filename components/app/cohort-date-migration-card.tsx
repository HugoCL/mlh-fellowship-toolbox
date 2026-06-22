"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { InfoCallout } from "@/components/app/info-callout"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { PROGRAM_TIMEZONE_LABEL } from "@/lib/dates"

type CohortDateMigrationCardProps = {
  cohortId: Id<"cohorts">
  scope: "umbrella" | "pod"
}

function summarizeMigration(result: {
  cohortsUpdated: number
  demoDaysUpdated: number
  lightningTalkSlotsUpdated: number
  mentorMeetingRoundsUpdated: number
  fieldsAlreadyNormalized: number
}): string {
  const updated =
    result.cohortsUpdated +
    result.demoDaysUpdated +
    result.lightningTalkSlotsUpdated +
    result.mentorMeetingRoundsUpdated

  if (updated === 0) {
    return "All program dates were already stored in Eastern Time."
  }

  const parts: string[] = []
  if (result.cohortsUpdated > 0) {
    parts.push(
      `${result.cohortsUpdated} cohort date ${result.cohortsUpdated === 1 ? "range" : "ranges"}`,
    )
  }
  if (result.demoDaysUpdated > 0) {
    parts.push(
      `${result.demoDaysUpdated} demo ${result.demoDaysUpdated === 1 ? "day" : "days"}`,
    )
  }
  if (result.lightningTalkSlotsUpdated > 0) {
    parts.push(
      `${result.lightningTalkSlotsUpdated} lightning talk ${result.lightningTalkSlotsUpdated === 1 ? "slot" : "slots"}`,
    )
  }
  if (result.mentorMeetingRoundsUpdated > 0) {
    parts.push(
      `${result.mentorMeetingRoundsUpdated} mentor ${result.mentorMeetingRoundsUpdated === 1 ? "round" : "rounds"}`,
    )
  }

  return `Updated ${parts.join(", ")} to ${PROGRAM_TIMEZONE_LABEL}.`
}

export function CohortDateMigrationCard({
  cohortId,
  scope,
}: CohortDateMigrationCardProps) {
  const migrateProgramDates = useMutation(
    api.cohorts.migrateProgramDatesToEastern,
  )
  const [isMigrating, setIsMigrating] = useState(false)

  async function handleMigrate() {
    setIsMigrating(true)
    try {
      const result = await migrateProgramDates({ cohortId })
      toast.success(summarizeMigration(result))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to normalize program dates.",
      )
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader title="Program dates" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InfoCallout variant="info">
          {scope === "umbrella"
            ? `Normalize stored dates for this cohort and every pod to midnight ${PROGRAM_TIMEZONE_LABEL}. Use this once if older data shows the wrong calendar day.`
            : `Normalize stored dates for this pod to midnight ${PROGRAM_TIMEZONE_LABEL}. Use this once if older data shows the wrong calendar day.`}
        </InfoCallout>
        <Button
          type="button"
          variant="outline"
          disabled={isMigrating}
          onClick={() => void handleMigrate()}
          className="self-start"
        >
          {isMigrating
            ? "Normalizing…"
            : `Normalize dates to ${PROGRAM_TIMEZONE_LABEL}`}
        </Button>
      </CardContent>
    </Card>
  )
}
