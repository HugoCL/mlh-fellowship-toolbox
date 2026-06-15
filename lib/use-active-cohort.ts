"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useActiveCohortContext(cohortId: Id<"cohorts"> | null) {
  const cohort = useQuery(
    api.cohorts.getCohort,
    cohortId ? { cohortId } : "skip",
  )

  return {
    cohort,
    isLoading: cohortId !== null && cohort === undefined,
    canManagePod: cohort?.canManagePod ?? false,
    hasChildPods: cohort?.hasChildPods ?? false,
    isPod: Boolean(cohort?.cohort.parentCohortId),
    isUmbrellaViewer: cohort?.isUmbrellaViewer ?? false,
    role: cohort?.role,
  }
}
