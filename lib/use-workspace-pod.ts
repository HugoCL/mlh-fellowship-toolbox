"use client"

import { useQuery } from "convex/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  cohortPath,
  dashboardPath,
  getCohortCodeFromPath,
  getFeatureSegmentFromPath,
  isFeaturePagePath,
} from "@/lib/cohort-routes"

export function useWorkspacePod(
  umbrellaCohortId: Id<"cohorts"> | undefined,
  umbrellaProgramCode: string | undefined,
  showUmbrellaAdminView: boolean,
) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const groups = useQuery(
    api.cohorts.listGroupsForParent,
    showUmbrellaAdminView && umbrellaCohortId
      ? { cohortId: umbrellaCohortId }
      : "skip",
  )

  const podProgramCodes = useMemo(
    () => new Set((groups ?? []).map((group) => group.cohort.programCode)),
    [groups],
  )

  const pathProgramCode = getCohortCodeFromPath(pathname)
  const pathPod =
    pathProgramCode && podProgramCodes.has(pathProgramCode)
      ? (groups ?? []).find(
          (group) => group.cohort.programCode === pathProgramCode,
        )
      : null
  const queryPodParam = searchParams.get("pod")
  const queryPod =
    queryPodParam && podProgramCodes.has(queryPodParam)
      ? (groups ?? []).find(
          (group) => group.cohort.programCode === queryPodParam,
        )
      : null

  const selectedPodId =
    pathPod?.cohort._id ??
    queryPod?.cohort._id ??
    groups?.[0]?.cohort._id ??
    null

  const selectedPod = (groups ?? []).find(
    (group) => group.cohort._id === selectedPodId,
  )

  function selectPod(podId: Id<"cohorts">) {
    if (!umbrellaCohortId || !umbrellaProgramCode) {
      return
    }

    const pod = (groups ?? []).find((group) => group.cohort._id === podId)
    if (!pod) {
      return
    }

    if (isFeaturePagePath(pathname)) {
      const segment = getFeatureSegmentFromPath(pathname)
      if (segment) {
        router.push(cohortPath(pod.cohort.programCode, segment))
        return
      }
    }

    router.push(dashboardPath(umbrellaProgramCode, pod.cohort.programCode))
  }

  return {
    groups,
    selectedPodId,
    selectedPod,
    selectPod,
    hasPods: (groups?.length ?? 0) > 0,
  }
}
