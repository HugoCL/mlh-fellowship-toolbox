"use client"

import { useMutation } from "convex/react"
import { ArrowRightIcon, CheckCircle2Icon, CircleIcon } from "lucide-react"
import Link from "next/link"
import { DiscordUsernameSetup } from "@/components/app/discord-username-setup"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
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
    <div className="flex max-w-3xl flex-col gap-6">
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

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Your fellows</h2>
        {openAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2Icon className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                No pending meetings. Assignments appear after the pod leader
                generates mentor pairings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-border/70 rounded-lg ring-1 ring-foreground/10">
            {openAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="flex items-start gap-3">
                  {assignment.scheduled ? (
                    <CircleIcon className="mt-0.5 size-4 text-primary" />
                  ) : (
                    <CircleIcon className="mt-0.5 size-4 text-muted-foreground" />
                  )}
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
