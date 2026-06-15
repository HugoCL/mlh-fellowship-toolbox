"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  parseProgramCodeForRoute,
  slugToProgramCode,
} from "@/lib/cohort-routes"

export function useCohortRoute() {
  const params = useParams<{ cohortCode: string }>()
  const programCode = params.cohortCode
    ? slugToProgramCode(decodeURIComponent(params.cohortCode))
    : null

  const { umbrellaProgramCode, podNumber } = programCode
    ? parseProgramCodeForRoute(programCode)
    : { umbrellaProgramCode: null, podNumber: null }

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
    podNumber,
    cohortId: (cohortData?.cohort._id ?? null) as Id<"cohorts"> | null,
    cohortData,
    settingsProgramCode,
    isLoading: programCode !== null && cohortData === undefined,
  }
}
