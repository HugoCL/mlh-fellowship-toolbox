"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { buildGroupProgramCode } from "@/convex/lib/programCode"
import { slugToProgramCode } from "@/lib/cohort-routes"

export function useCohortRoute() {
  const params = useParams<{ cohortCode: string; podNumber?: string }>()
  const umbrellaProgramCode = params.cohortCode
    ? slugToProgramCode(decodeURIComponent(params.cohortCode))
    : null

  const programCode =
    umbrellaProgramCode && params.podNumber
      ? buildGroupProgramCode(
          umbrellaProgramCode,
          Number.parseInt(params.podNumber, 10),
        )
      : umbrellaProgramCode

  const cohortData = useQuery(
    api.cohorts.getCohortByProgramCode,
    programCode ? { programCode } : "skip",
  )

  const settingsProgramCode =
    cohortData?.isUmbrellaViewer && cohortData.parentProgramCode
      ? cohortData.parentProgramCode
      : (cohortData?.cohort.programCode ?? null)

  return {
    programCode,
    umbrellaProgramCode,
    podNumber: params.podNumber
      ? Number.parseInt(params.podNumber, 10)
      : null,
    cohortId: (cohortData?.cohort._id ?? null) as Id<"cohorts"> | null,
    cohortData,
    settingsProgramCode,
    isLoading: programCode !== null && cohortData === undefined,
  }
}
