"use client"

import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { CohortDateMigrationCard } from "@/components/app/cohort-date-migration-card"
import { CohortGeneralSettingsForm } from "@/components/app/cohort-general-settings-form"
import { CohortInviteLeaderSection } from "@/components/app/cohort-settings/cohort-invite-leader-section"
import { CohortPodLeaderInvitesSection } from "@/components/app/cohort-settings/cohort-pod-leader-invites-section"
import { CohortPodsSection } from "@/components/app/cohort-settings/cohort-pods-section"
import { PodDirectoryCard } from "@/components/app/cohort-settings/pod-directory-card"
import { InfoCallout } from "@/components/app/info-callout"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PageSkeleton, SkeletonList } from "@/components/app/page-skeleton"
import { PodSettingsEditDialog } from "@/components/app/pod-settings-edit-dialog"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"

export function CohortSettingsPage() {
  const { cohortId, cohortData, isLoading } = useCohortRoute()
  const { isImpersonating, isLoading: isImpersonationLoading } =
    useIsImpersonating()

  const isPod = Boolean(cohortData?.cohort.parentCohortId)
  const canAccessPodSettings =
    !isImpersonating &&
    Boolean(cohortData?.canManagePod || cohortData?.isUmbrellaViewer)
  const canLoadUmbrellaLeaderData =
    !isPod &&
    cohortData?.role === "podLeader" &&
    cohortId &&
    !isImpersonationLoading &&
    !isImpersonating

  const groups = useQuery(
    api.cohorts.listGroupsForParent,
    canLoadUmbrellaLeaderData ? { cohortId } : "skip",
  )
  const invites = useQuery(
    api.invites.listPendingForCohort,
    canLoadUmbrellaLeaderData ? { cohortId } : "skip",
  )

  const createPod = useMutation(api.cohorts.createPod)

  const [selectedPodId, setSelectedPodId] = useState<Id<"cohorts"> | "">("")
  const [isCreatingPod, setIsCreatingPod] = useState(false)
  const [editingPod, setEditingPod] = useState<Doc<"cohorts"> | null>(null)

  if (isLoading || cohortData === undefined) {
    return (
      <PageSkeleton
        title="Settings"
        description="Loading cohort settings…"
        width="narrow"
      >
        <SkeletonList count={4} />
      </PageSkeleton>
    )
  }

  if (!cohortId) {
    return (
      <>
        <PageHeader title="Settings" description="Cohort not found." />
        <PageBody width="narrow">
          <InfoCallout variant="warning">
            This program code does not match a cohort you can access.
          </InfoCallout>
        </PageBody>
      </>
    )
  }

  if (cohortData.role !== "podLeader") {
    return (
      <>
        <PageHeader
          title={isPod ? "Pod Settings" : "Cohort Settings"}
          description="Administrator or pod leader access required."
        />
        <PageBody width="narrow">
          <InfoCallout variant="warning">
            You need administrator or pod leader access to manage settings.
          </InfoCallout>
        </PageBody>
      </>
    )
  }

  if (isPod && !canAccessPodSettings) {
    return (
      <>
        <PageHeader
          title="Pod Settings"
          description={
            isImpersonating
              ? "Stop impersonating to manage pod settings."
              : "Pod leader or cohort admin access required."
          }
        />
        <PageBody width="narrow">
          <InfoCallout variant="warning">
            {isImpersonating
              ? "Pod settings are not available while viewing as a fellow."
              : "Pod leaders manage their own pod. Switch to your pod in the sidebar."}
          </InfoCallout>
        </PageBody>
      </>
    )
  }

  if (isPod) {
    return (
      <>
        <PageHeader
          title="Pod Settings"
          description={`Program setup for ${cohortData.cohort.programCode}.`}
        />
        <PageBody width="narrow">
          <CohortGeneralSettingsForm
            cohortId={cohortId}
            cohort={cohortData.cohort}
            variant="pod"
          />
          <CohortDateMigrationCard cohortId={cohortId} scope="pod" />
          <PodDirectoryCard programCode={cohortData.cohort.programCode} />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Cohort Settings"
        description="Create pods, assign pod leaders, and view pod status. Fellows, mentors, and activities are managed inside each pod."
      />
      <PageBody width="narrow">
        <CohortGeneralSettingsForm
          cohortId={cohortId}
          cohort={cohortData.cohort}
          variant="umbrella"
        />
        <CohortDateMigrationCard cohortId={cohortId} scope="umbrella" />

        <CohortPodsSection
          programCode={cohortData.cohort.programCode}
          groups={groups}
          isCreatingPod={isCreatingPod}
          onCreatePod={async () => {
            setIsCreatingPod(true)
            try {
              const podId = await createPod({ cohortId })
              toast.success("Pod created.")
              setSelectedPodId(podId)
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to create pod.",
              )
            } finally {
              setIsCreatingPod(false)
            }
          }}
          onEditPod={setEditingPod}
          onInviteLeader={setSelectedPodId}
        />

        <PodSettingsEditDialog
          pod={editingPod}
          open={editingPod !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPod(null)
            }
          }}
        />

        <CohortInviteLeaderSection
          cohortId={cohortId}
          groups={groups}
          selectedPodId={selectedPodId}
          onSelectedPodIdChange={setSelectedPodId}
        />

        <CohortPodLeaderInvitesSection invites={invites} />
      </PageBody>
    </>
  )
}
