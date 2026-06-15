"use client"

import { useQuery } from "convex/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getCohortIdFromPath, isFeaturePagePath } from "@/lib/workspace-pod"

export function useWorkspacePod(
  umbrellaCohortId: Id<"cohorts"> | undefined,
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

  const podIds = useMemo(
    () => new Set((groups ?? []).map((group) => group.cohort._id)),
    [groups],
  )

  const pathCohortId = getCohortIdFromPath(pathname)
  const pathPodId =
    pathCohortId && podIds.has(pathCohortId) ? pathCohortId : null
  const queryPodParam = searchParams.get("pod") as Id<"cohorts"> | null
  const queryPodId =
    queryPodParam && podIds.has(queryPodParam) ? queryPodParam : null

  const selectedPodId =
    pathPodId ?? queryPodId ?? groups?.[0]?.cohort._id ?? null

  const selectedPod = (groups ?? []).find(
    (group) => group.cohort._id === selectedPodId,
  )

  function selectPod(podId: Id<"cohorts">) {
    if (!umbrellaCohortId) {
      return
    }

    if (isFeaturePagePath(pathname) && pathPodId) {
      const segment = pathname.replace(/^\/cohorts\/[^/]+\//, "")
      router.push(`/cohorts/${podId}/${segment}`)
      return
    }

    router.push(`/dashboard?cohort=${umbrellaCohortId}&pod=${podId}`)
  }

  return {
    groups,
    selectedPodId,
    selectedPod,
    selectPod,
    hasPods: (groups?.length ?? 0) > 0,
  }
}
