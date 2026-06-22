"use client"

import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { InfoCallout } from "@/components/app/info-callout"
import { SectionHeader } from "@/components/app/section-header"
import { Stat, StatGroup } from "@/components/app/stat"
import { Button } from "@/components/ui/button"
import { cohortPath } from "@/lib/cohort-routes"

type PodSummary = {
  cohort: {
    _id: string
    programCode: string
    name: string
    groupNumber?: number
  }
  leader: { name: string; email: string } | null
  pendingLeaderEmail: string | null
  fellowCount: number
}

type UmbrellaOverviewPanelProps = {
  umbrellaProgramCode: string
  groups: PodSummary[]
}

export function UmbrellaOverviewPanel({
  umbrellaProgramCode,
  groups,
}: UmbrellaOverviewPanelProps) {
  const totalFellows = groups.reduce((sum, group) => sum + group.fellowCount, 0)
  const podsWithoutLeader = groups.filter((group) => !group.leader).length

  return (
    <div className="flex flex-col gap-6">
      <InfoCallout variant="neutral">
        You manage the cohort umbrella. Pod leaders run fellows, mentors, and
        activities inside their pods.
      </InfoCallout>

      <StatGroup columns={3}>
        <Stat label="Pods" value={groups.length} />
        <Stat label="Fellows" value={totalFellows} />
        <Stat
          label="Needs leaders"
          value={podsWithoutLeader}
          detail={
            podsWithoutLeader > 0
              ? podsWithoutLeader === 1
                ? "pod unassigned"
                : "pods unassigned"
              : undefined
          }
        />
      </StatGroup>

      {groups.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Pods"
            description="Select a pod in the sidebar to view its dashboard."
          />
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {groups.map((group) => (
              <li key={group.cohort._id}>
                <Link
                  href={cohortPath(group.cohort.programCode)}
                  className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{group.cohort.programCode}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.leader
                        ? `Led by ${group.leader.name}`
                        : group.pendingLeaderEmail
                          ? `Invite pending · ${group.pendingLeaderEmail}`
                          : "No pod leader assigned"}
                      {" · "}
                      {group.fellowCount} fellow
                      {group.fellowCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button
        nativeButton={false}
        render={<Link href={cohortPath(umbrellaProgramCode, "settings")} />}
      >
        Cohort settings
      </Button>
    </div>
  )
}
