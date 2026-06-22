"use client"

import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import {
  PageSkeleton,
  SkeletonCardGrid,
  SkeletonTable,
} from "@/components/app/page-skeleton"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { OneOnOneStatus } from "@/lib/status"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { FellowOneOnOnesView } from "./fellow-view"
import { LeaderOneOnOnesView } from "./leader-view"

export default function OneOnOnesPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const peerData = useQuery(
    api.oneOnOnes.listPeerOneOnOnes,
    cohortId ? { cohortId } : "skip",
  )
  const leaderData = useQuery(
    api.oneOnOnes.listLeaderOneOnOnes,
    cohortId ? { cohortId } : "skip",
  )
  const updatePeerStatus = useMutation(api.oneOnOnes.updatePeerStatus)
  const updateLeaderStatus = useMutation(api.oneOnOnes.updateLeaderStatus)
  const createInstance = useMutation(api.oneOnOnes.createInstance)
  const generatePeerPairs = useMutation(api.oneOnOnes.generatePeerPairs)
  const generateLeaderRecords = useMutation(api.oneOnOnes.generateLeaderRecords)

  const fellows = peerData?.fellows ?? []
  const isLeader = cohort?.canManagePod ?? false
  const isImpersonating = cohort?.impersonation != null
  const showLeaderView = cohort
    ? !isImpersonating && (cohort.canManagePod || cohort.isUmbrellaViewer)
    : false
  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer
  const myFellowId = cohort?.fellow?._id

  function canEditPair(fellowAId: Id<"fellows">, fellowBId: Id<"fellows">) {
    if (isLeader) return true
    if (!myFellowId) return false
    return myFellowId === fellowAId || myFellowId === fellowBId
  }

  async function setPeerStatus(
    fellowAId: Id<"fellows">,
    fellowBId: Id<"fellows">,
    status: OneOnOneStatus,
  ) {
    if (!cohortId) return
    try {
      await updatePeerStatus({ cohortId, fellowAId, fellowBId, status })
      toast.success("Peer 1:1 updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  async function setLeaderStatus(
    fellowId: Id<"fellows">,
    instanceId: Id<"oneOnOneInstances">,
    status: OneOnOneStatus,
  ) {
    if (!cohortId) return
    try {
      await updateLeaderStatus({ cohortId, fellowId, instanceId, status })
      toast.success("Pod leader 1:1 updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  if (isLoading || peerData === undefined || leaderData === undefined) {
    return (
      <PageSkeleton
        title="1:1 Tracker"
        description="Track peer 1:1s and pod leader check-ins for this cohort."
        width="wide"
      >
        <SkeletonCardGrid count={2} columns={2} />
        <SkeletonTable rows={6} columns={5} />
      </PageSkeleton>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="1:1 Tracker"
          description="Track peer 1:1s and pod leader check-ins for this cohort."
        />
        <PageBody>
          <EmptyState
            title="Cohort not found"
            description="This program code does not match a cohort you can access."
          />
        </PageBody>
      </>
    )
  }

  if (isUmbrellaAdminBlocked) {
    return (
      <>
        <PageHeader
          title="1:1 Tracker"
          description="Track peer 1:1s and pod leader check-ins for this cohort."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  if (!showLeaderView) {
    return (
      <FellowOneOnOnesView
        myFellowId={myFellowId}
        fellows={fellows}
        pairs={peerData.pairs}
        instances={leaderData.instances}
        records={leaderData.records}
        podLeaderSchedulingLink={leaderData.podLeaderSchedulingLink}
        setPeerStatus={setPeerStatus}
        setLeaderStatus={setLeaderStatus}
      />
    )
  }

  return (
    <LeaderOneOnOnesView
      cohortId={cohortId}
      settingsProgramCode={settingsProgramCode ?? ""}
      programCode={cohort.cohort.programCode}
      fellows={fellows}
      leaderFellows={leaderData.fellows}
      pairs={peerData.pairs}
      instances={leaderData.instances}
      records={leaderData.records}
      isLeader={isLeader}
      myFellowId={myFellowId}
      canEditPair={canEditPair}
      setPeerStatus={setPeerStatus}
      setLeaderStatus={setLeaderStatus}
      createInstance={createInstance}
      generatePeerPairs={generatePeerPairs}
      generateLeaderRecords={generateLeaderRecords}
    />
  )
}
