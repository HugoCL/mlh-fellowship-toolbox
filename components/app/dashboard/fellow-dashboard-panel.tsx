"use client"

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
} from "lucide-react"
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
import type { Id } from "@/convex/_generated/dataModel"
import { myTasksPath } from "@/lib/cohort-routes"
import { cn } from "@/lib/utils"

type FellowActionItem = {
  id: string
  title: string
  subtitle: string
  href: string
  status: "todo" | "scheduled" | "done"
}

type FellowDashboardPanelProps = {
  cohortId: Id<"cohorts">
  programCode: string
  needsCalendly: boolean
  needsDiscord: boolean
  calendlyUrl?: string
  discordUsername?: string | null
  actionItems: FellowActionItem[]
  completedCount: number
  totalCount: number
}

function statusIcon(status: FellowActionItem["status"]) {
  switch (status) {
    case "done":
      return CheckCircle2Icon
    case "scheduled":
      return ClockIcon
    case "todo":
      return CircleIcon
  }
}

function statusLabel(status: FellowActionItem["status"]) {
  switch (status) {
    case "done":
      return "Done"
    case "scheduled":
      return "Scheduled"
    case "todo":
      return "To do"
  }
}

export function FellowDashboardPanel({
  cohortId,
  programCode,
  needsCalendly,
  needsDiscord,
  calendlyUrl,
  discordUsername,
  actionItems,
  completedCount,
  totalCount,
}: FellowDashboardPanelProps) {
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const openItems = actionItems.filter((item) => item.status !== "done")

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your program progress</CardTitle>
          <CardDescription>
            {totalCount === 0
              ? "Activities will appear here once your pod leader configures them."
              : `${completedCount} of ${totalCount} items complete across 1:1s, mentors, demo day, and talks.`}
          </CardDescription>
        </CardHeader>
        {totalCount > 0 ? (
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3">
              <p className="font-heading text-4xl font-semibold tabular-nums">
                {progressPercent}%
              </p>
              <ButtonLink
                href={myTasksPath(programCode)}
                label="Full checklist"
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        ) : null}
      </Card>

      {needsCalendly ? (
        <SchedulingLinkSetup
          key={calendlyUrl}
          cohortId={cohortId}
          role="fellow"
          calendlyUrl={calendlyUrl}
          variant="action"
        />
      ) : null}

      {needsDiscord ? (
        <DiscordUsernameSetup
          key={discordUsername}
          discordUsername={discordUsername}
          variant="action"
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Next up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {openItems.length === 0
                ? "You're caught up — nice work."
                : `${openItems.length} item${openItems.length === 1 ? "" : "s"} waiting on you.`}
            </p>
          </div>
        </div>

        {openItems.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2Icon className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                No open tasks right now. Check back after your pod leader adds
                more activities.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y divide-border/70 rounded-lg ring-1 ring-foreground/10">
            {openItems.map((item) => {
              const Icon = statusIcon(item.status)
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        item.status === "scheduled"
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <Badge variant="outline">
                          {statusLabel(item.status)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>
                    <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRightIcon className="size-3.5" />
    </Link>
  )
}
