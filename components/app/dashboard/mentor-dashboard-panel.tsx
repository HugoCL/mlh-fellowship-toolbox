"use client"

import { useMutation } from "convex/react"
import { ArrowRightIcon, CircleIcon } from "lucide-react"
import Link from "next/link"
import { DiscordUsernameSetup } from "@/components/app/discord-username-setup"
import { EmptyState } from "@/components/app/empty-state"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { SectionHeader } from "@/components/app/section-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"

type MentorAssignmentItem = {
  id: string
  fellowName: string
  roundLabel: string
  scheduled: boolean
  completed: boolean
}

type MentorDashboardPanelProps = {
  cohortId: Id<"cohorts">
  programCode: string
  needsCalendly: boolean
  needsDiscord: boolean
  calendlyUrl?: string
  discordUsername?: string | null
  pendingCount: number
  assignments: MentorAssignmentItem[]
}

export function MentorDashboardPanel({
  cohortId,
  programCode,
  needsCalendly,
  needsDiscord,
  calendlyUrl,
  discordUsername,
  pendingCount,
  assignments,
}: MentorDashboardPanelProps) {
  const updateMentorCalendly = useMutation(api.mentors.updateMyCalendly)
  const updateMentorDiscordUsername = useMutation(
    api.mentors.updateMyDiscordUsername,
  )
  const openAssignments = assignments.filter(
    (assignment) => !assignment.completed,
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mentor meetings</CardTitle>
          <CardDescription>
            {pendingCount === 0
              ? "All assigned meetings are complete."
              : `${pendingCount} meeting${pendingCount === 1 ? "" : "s"} still open with fellows in this pod.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={cohortPath(programCode, "mentors")}
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            Open mentor tracker
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      {needsCalendly ? (
        <SchedulingLinkSetup
          key={`scheduling-${calendlyUrl ?? ""}`}
          fieldId="scheduling-link-mentor"
          calendlyUrl={calendlyUrl}
          variant="action"
          onSave={async (url) => {
            await updateMentorCalendly({ cohortId, calendlyUrl: url })
          }}
        />
      ) : null}

      {needsDiscord ? (
        <DiscordUsernameSetup
          key={`discord-${discordUsername ?? ""}`}
          discordUsername={discordUsername}
          variant="action"
          onSave={async (username) => {
            await updateMentorDiscordUsername({
              cohortId,
              discordUsername: username,
            })
          }}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Your fellows"
          description={
            openAssignments.length === 0
              ? "Assignments appear after the pod leader generates mentor pairings."
              : `${openAssignments.length} open meeting${openAssignments.length === 1 ? "" : "s"}.`
          }
        />
        {openAssignments.length === 0 ? (
          <EmptyState
            title="No pending meetings"
            description="You're all caught up with your assigned fellows."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {openAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="flex items-start gap-3">
                  <CircleIcon
                    className={
                      assignment.scheduled
                        ? "mt-0.5 size-4 text-primary"
                        : "mt-0.5 size-4 text-muted-foreground"
                    }
                  />
                  <div>
                    <p className="font-medium">{assignment.fellowName}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.roundLabel}
                    </p>
                  </div>
                </div>
                <Badge variant={assignment.scheduled ? "secondary" : "outline"}>
                  {assignment.scheduled ? "Scheduled" : "Not yet"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
