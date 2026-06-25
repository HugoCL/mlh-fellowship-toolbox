"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import type { ReactNode } from "react"
import { DirectoryGrid } from "@/components/app/directory-grid"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PublicMentorSchedule } from "@/components/app/public-mentor-schedule"
import { api } from "@/convex/_generated/api"
import { shareFeatureFromRouteSegment } from "@/lib/public-share-links"

export default function PublicSharePage() {
  const params = useParams<{ feature: string; token: string }>()
  const feature = shareFeatureFromRouteSegment(params.feature)

  const directory = useQuery(
    api.publicShares.getDirectoryByToken,
    feature === "directory" ? { token: params.token } : "skip",
  )
  const mentorSchedule = useQuery(
    api.publicShares.getMentorScheduleByToken,
    feature === "mentorMeetings" ? { token: params.token } : "skip",
  )

  if (!feature) {
    return <UnavailableShare />
  }

  const isLoading =
    (feature === "directory" && directory === undefined) ||
    (feature === "mentorMeetings" && mentorSchedule === undefined)

  if (isLoading) {
    return (
      <PublicShell title="Loading shared view">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PublicShell>
    )
  }

  if (feature === "directory") {
    if (!directory) return <UnavailableShare />
    return (
      <PublicShell
        title="Directory"
        description={`Contact directory for pod ${directory.cohortProgramCode}.`}
      >
        <DirectoryGrid
          people={directory.people}
          showMemberStatus={false}
          canManageMentors={false}
        />
      </PublicShell>
    )
  }

  if (!mentorSchedule) return <UnavailableShare />
  return (
    <PublicShell
      title="Mentor Meetings"
      description={`Mentor meeting schedule for pod ${mentorSchedule.cohortProgramCode}.`}
    >
      <PublicMentorSchedule
        rounds={mentorSchedule.rounds}
        assignments={mentorSchedule.assignments}
      />
    </PublicShell>
  )
}

function PublicShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <main id="main-content" className="min-h-svh bg-background">
      <PageHeader title={title} description={description} />
      <PageBody>{children}</PageBody>
    </main>
  )
}

function UnavailableShare() {
  return (
    <PublicShell title="Shared view unavailable">
      <EmptyState
        title="Shared view unavailable"
        description="This public link may be invalid, disabled, or replaced."
      />
    </PublicShell>
  )
}
