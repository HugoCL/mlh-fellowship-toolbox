"use client"

import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <div className="flex max-w-4xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        You manage the cohort umbrella. Pod leaders run fellows, mentors, and
        activities inside their pods.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pods</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {groups.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fellows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {totalFellows}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {podsWithoutLeader}
            </p>
          </CardContent>
        </Card>
      </div>

      {groups.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">Pods</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a pod in the sidebar to view its dashboard.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border/70 rounded-lg ring-1 ring-foreground/10">
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
