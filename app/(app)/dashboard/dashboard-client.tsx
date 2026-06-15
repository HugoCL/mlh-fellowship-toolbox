"use client"

import { useQuery } from "convex/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  isCohortAdminOnUmbrella,
  isUmbrellaAdminView,
} from "@/lib/cohort-access"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { ProgressStat } from "@/lib/status"
import { useWorkspacePod } from "@/lib/use-workspace-pod"

export default function DashboardPageClient() {
  const searchParams = useSearchParams()
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const requestedCohortId = searchParams.get("cohort") as Id<"cohorts"> | null
  const activeCohort =
    cohorts?.find((item) => item.cohort._id === requestedCohortId) ??
    cohorts?.[0]

  const cohortDetails = useQuery(
    api.cohorts.getCohort,
    activeCohort ? { cohortId: activeCohort.cohort._id } : "skip",
  )

  const isCohortAdmin =
    cohortDetails &&
    isCohortAdminOnUmbrella(cohortDetails.role, cohortDetails.cohort)

  const showUmbrellaAdminView =
    cohortDetails &&
    isUmbrellaAdminView(
      cohortDetails.role,
      cohortDetails.cohort,
      cohortDetails.hasChildPods,
    )

  const { selectedPodId, selectedPod, groups, hasPods } = useWorkspacePod(
    isCohortAdmin && activeCohort ? activeCohort.cohort._id : undefined,
    Boolean(isCohortAdmin && activeCohort),
  )

  const viewingPodId =
    activeCohort &&
    (showUmbrellaAdminView && selectedPodId
      ? selectedPodId
      : activeCohort.cohort._id)

  const summary = useQuery(
    api.cohorts.getDashboardSummary,
    viewingPodId && (!showUmbrellaAdminView || selectedPodId)
      ? { cohortId: viewingPodId }
      : "skip",
  )

  if (cohorts === undefined) {
    return (
      <>
        <PageHeader title="Dashboard" description="Loading cohort health…" />
        <PageBody>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-lg" />
            ))}
          </div>
        </PageBody>
      </>
    )
  }

  if (!activeCohort) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Track pod activity across your fellowship cohort."
        />
        <PageBody>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No cohort yet</EmptyTitle>
              <EmptyDescription>
                Create a cohort to start tracking 1:1s, mentors, demos, and
                talks.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/cohorts" />}>
                Create Cohort
              </Button>
            </EmptyContent>
          </Empty>
        </PageBody>
      </>
    )
  }

  function dashboardDescription() {
    if (!activeCohort || !cohortDetails) {
      return "Loading…"
    }
    if (showUmbrellaAdminView && selectedPod) {
      return `${selectedPod.cohort.programCode} · Cohort admin (viewing pod)`
    }
    if (showUmbrellaAdminView) {
      return `${activeCohort.cohort.programCode} · Cohort administrator`
    }
    if (cohortDetails.canManagePod) {
      return `${activeCohort.cohort.programCode} · Pod leader`
    }
    return `${activeCohort.cohort.programCode} · Fellow`
  }

  const viewingPodCohortId =
    showUmbrellaAdminView && selectedPodId
      ? selectedPodId
      : activeCohort.cohort._id

  const needsSchedulingLink =
    cohortDetails &&
    !showUmbrellaAdminView &&
    ((cohortDetails.role === "fellow" &&
      !hasSchedulingLink(cohortDetails.fellow?.calendlyUrl)) ||
      (cohortDetails.role === "mentor" &&
        !hasSchedulingLink(cohortDetails.mentor?.calendlyUrl)))

  if (showUmbrellaAdminView && !selectedPodId && !hasPods) {
    const totalFellows = (groups ?? []).reduce(
      (sum, group) => sum + group.fellowCount,
      0,
    )

    return (
      <>
        <PageHeader
          title={activeCohort.cohort.name}
          description={dashboardDescription()}
        />
        <PageBody>
          <div className="flex max-w-2xl flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              You manage this cohort umbrella. Pod leaders run fellows, mentors,
              and activities inside their own pods — open Cohort Settings to
              invite leaders and view pods.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
                <p className="text-sm font-medium">Pods</p>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  {groups?.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
                <p className="text-sm font-medium">Fellows across pods</p>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  {totalFellows}
                </p>
              </div>
            </div>
            <Button
              nativeButton={false}
              render={
                <Link href={`/cohorts/${activeCohort.cohort._id}/settings`} />
              }
            >
              Cohort Settings
            </Button>
          </div>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={
          showUmbrellaAdminView && selectedPod
            ? selectedPod.cohort.name
            : activeCohort.cohort.name
        }
        description={dashboardDescription()}
      />
      <PageBody>
        {needsSchedulingLink &&
        cohortDetails &&
        (cohortDetails.role === "fellow" || cohortDetails.role === "mentor") ? (
          <div className="mb-6 max-w-xl">
            <SchedulingLinkSetup
              key={
                cohortDetails.role === "fellow"
                  ? cohortDetails.fellow?.calendlyUrl
                  : cohortDetails.mentor?.calendlyUrl
              }
              cohortId={viewingPodCohortId}
              role={cohortDetails.role}
              calendlyUrl={
                cohortDetails.role === "fellow"
                  ? cohortDetails.fellow?.calendlyUrl
                  : cohortDetails.mentor?.calendlyUrl
              }
              variant="action"
            />
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ProgressStat
            label="Peer 1:1s"
            completed={summary?.peerCompleted ?? 0}
            total={summary?.peerTotal ?? 0}
          />
          <ProgressStat
            label="Pod Leader 1:1s"
            completed={summary?.leaderCompleted ?? 0}
            total={summary?.leaderTotal ?? 0}
          />
          <ProgressStat
            label="Mentor Meetings"
            completed={summary?.mentorCompleted ?? 0}
            total={summary?.mentorTotal ?? 0}
          />
          <ProgressStat
            label="Demo Days"
            completed={summary?.demoCompleted ?? 0}
            total={summary?.demoTotal ?? 0}
          />
          <ProgressStat
            label="Lightning Talks"
            completed={summary?.lightningCompleted ?? 0}
            total={summary?.lightningTotal ?? 0}
          />
          <div className="flex flex-col justify-center rounded-lg border border-border/70 bg-card/40 px-4 py-3">
            <p className="text-sm font-medium">Fellows in pod</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {summary?.fellowCount ?? 0}
            </p>
          </div>
        </div>
      </PageBody>
    </>
  )
}
