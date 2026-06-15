"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useActiveCohortContext(programCode: string | null) {
  const cohort = useQuery(
    api.cohorts.getCohortByProgramCode,
    programCode ? { programCode } : "skip",
  )

  return {
    cohort,
    isLoading: programCode !== null && cohort === undefined,
    canManagePod: cohort?.canManagePod ?? false,
    hasChildPods: cohort?.hasChildPods ?? false,
    isPod: Boolean(cohort?.cohort.parentCohortId),
    isUmbrellaViewer: cohort?.isUmbrellaViewer ?? false,
    role: cohort?.role,
  }
}
