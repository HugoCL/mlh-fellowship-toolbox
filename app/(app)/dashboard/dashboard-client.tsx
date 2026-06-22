"use client"

import { useQuery } from "convex/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FellowDashboardPanel } from "@/components/app/dashboard/fellow-dashboard-panel"
import { LeaderDashboardPanel } from "@/components/app/dashboard/leader-dashboard-panel"
import { MentorDashboardPanel } from "@/components/app/dashboard/mentor-dashboard-panel"
import { UmbrellaOverviewPanel } from "@/components/app/dashboard/umbrella-overview-panel"
import {
  DashboardLoadingShell,
  DashboardSkeleton,
} from "@/components/app/dashboard-skeleton"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import {
  cohortDisplayTitle,
  isCohortAdminOnUmbrella,
  isUmbrellaAdminView,
} from "@/lib/cohort-access"
import { cohortPath } from "@/lib/cohort-routes"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { useWorkspacePod } from "@/lib/use-workspace-pod"

export default function DashboardPageClient() {
  const searchParams = useSearchParams()
  const { isImpersonating, impersonation } = useIsImpersonating()
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const requestedCohortCode = searchParams.get("cohort")
  const activeCohort =
    cohorts?.find((item) => item.cohort.programCode === requestedCohortCode) ??
    cohorts?.[0]

  const cohortDetails = useQuery(
    api.cohorts.getCohort,
    activeCohort ? { cohortId: activeCohort.cohort._id } : "skip",
  )

  const isCohortAdmin =
    cohortDetails &&
    isCohortAdminOnUmbrella(
      cohortDetails.realRole ?? cohortDetails.role,
      cohortDetails.cohort,
    )

  const showUmbrellaAdminView =
    !isImpersonating &&
    cohortDetails &&
    isUmbrellaAdminView(
      cohortDetails.realRole ?? cohortDetails.role,
      cohortDetails.cohort,
      cohortDetails.hasChildPods,
    )

  const impersonatedPodDetails = useQuery(
    api.cohorts.getCohort,
    isImpersonating && impersonation
      ? { cohortId: impersonation.cohort._id }
      : "skip",
  )

  const effectiveCohortDetails =
    isImpersonating && impersonatedPodDetails
      ? impersonatedPodDetails
      : cohortDetails

  const { selectedPodId, selectedPod, groups, hasPods } = useWorkspacePod(
    isCohortAdmin && activeCohort && !isImpersonating
      ? activeCohort.cohort._id
      : undefined,
    isCohortAdmin && activeCohort && !isImpersonating
      ? activeCohort.cohort.programCode
      : undefined,
    Boolean(isCohortAdmin && activeCohort && !isImpersonating),
  )

  const viewingPodId = isImpersonating
    ? impersonation?.cohort._id
    : activeCohort &&
      (showUmbrellaAdminView && selectedPodId
        ? selectedPodId
        : activeCohort.cohort._id)

  const insights = useQuery(
    api.dashboard.getDashboardInsights,
    viewingPodId ? { cohortId: viewingPodId } : "skip",
  )

  const viewingPodProgramCode = isImpersonating
    ? (impersonation?.cohort.programCode ?? "")
    : showUmbrellaAdminView && selectedPod
      ? selectedPod.cohort.programCode
      : (activeCohort?.cohort.programCode ?? "")

  if (cohorts === undefined) {
    return <DashboardLoadingShell />
  }

  if (!activeCohort) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Your fellowship home base."
        />
        <PageBody width="wide">
          <EmptyState
            title="No cohort yet"
            description="Create a cohort to start tracking 1:1s, mentors, demos, and talks."
            action={
              <Button nativeButton={false} render={<Link href="/cohorts" />}>
                Create cohort
              </Button>
            }
          />
        </PageBody>
      </>
    )
  }

  function dashboardDescription() {
    if (!activeCohort || !effectiveCohortDetails) {
      return "Loading…"
    }
    if (isImpersonating && impersonation) {
      return `${impersonation.cohort.programCode} · Viewing as fellow`
    }
    if (showUmbrellaAdminView && selectedPod) {
      return `${selectedPod.cohort.programCode} · Cohort admin (viewing pod)`
    }
    if (showUmbrellaAdminView) {
      return `${activeCohort.cohort.programCode} · Cohort administrator`
    }
    if (effectiveCohortDetails.canManagePod) {
      return `${activeCohort.cohort.programCode} · Pod leader`
    }
    if (effectiveCohortDetails.role === "mentor") {
      return `${activeCohort.cohort.programCode} · Mentor`
    }
    return `${activeCohort.cohort.programCode} · Fellow`
  }

  if (showUmbrellaAdminView && !selectedPodId && !hasPods) {
    return (
      <>
        <PageHeader
          title={cohortDisplayTitle(activeCohort.cohort)}
          description={dashboardDescription()}
        />
        <PageBody width="wide">
          <UmbrellaOverviewPanel
            umbrellaProgramCode={activeCohort.cohort.programCode}
            groups={groups ?? []}
          />
        </PageBody>
      </>
    )
  }

  const headerCohort =
    isImpersonating && impersonation
      ? impersonation.cohort
      : showUmbrellaAdminView && selectedPod
        ? selectedPod.cohort
        : activeCohort.cohort

  return (
    <>
      <PageHeader
        title={cohortDisplayTitle(headerCohort)}
        description={dashboardDescription()}
      />
      <PageBody width="wide">
        {insights === undefined ? (
          <DashboardSkeleton />
        ) : insights.view === "leader" ? (
          <LeaderDashboardPanel
            fellowCount={insights.fellowCount}
            mentorCount={insights.mentorCount}
            directoryHref={cohortPath(viewingPodProgramCode, "directory")}
            setupTasks={insights.setupTasks}
            activityModules={insights.activityModules}
            programStarted={insights.programStarted}
            readOnly={Boolean(showUmbrellaAdminView && selectedPod)}
          />
        ) : insights.view === "fellow" ? (
          <FellowDashboardPanel
            cohortId={viewingPodId!}
            programCode={viewingPodProgramCode}
            needsCalendly={insights.needsCalendly}
            needsDiscord={insights.needsDiscord}
            calendlyUrl={effectiveCohortDetails?.fellow?.calendlyUrl}
            discordUsername={effectiveCohortDetails?.discordUsername}
            actionItems={insights.actionItems}
            completedCount={insights.completedCount}
            totalCount={insights.totalCount}
          />
        ) : (
          <MentorDashboardPanel
            cohortId={viewingPodId!}
            programCode={viewingPodProgramCode}
            needsCalendly={insights.needsCalendly}
            needsDiscord={insights.needsDiscord}
            calendlyUrl={effectiveCohortDetails?.mentor?.calendlyUrl}
            discordUsername={effectiveCohortDetails?.discordUsername}
            pendingCount={insights.pendingCount}
            assignments={insights.assignments}
          />
        )}
      </PageBody>
    </>
  )
}
