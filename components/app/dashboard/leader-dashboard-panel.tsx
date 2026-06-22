"use client"

import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/app/empty-state"
import { ProgressBar } from "@/components/app/progress-bar"
import { SectionHeader } from "@/components/app/section-header"
import { Stat, StatStrip } from "@/components/app/stat"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SetupTask = {
  id: string
  title: string
  description: string
  href: string
  priority: "high" | "medium"
}

type ActivityModule = {
  id: string
  label: string
  completed: number
  total: number
  href: string
  status: "notStarted" | "inProgress" | "complete"
}

type LeaderDashboardPanelProps = {
  fellowCount: number
  mentorCount: number
  directoryHref: string
  setupTasks: SetupTask[]
  activityModules: ActivityModule[]
  programStarted: boolean
  readOnly?: boolean
}

function modulePercent(completed: number, total: number) {
  if (total === 0) {
    return 0
  }
  return Math.round((completed / total) * 100)
}

export function LeaderDashboardPanel({
  fellowCount,
  mentorCount,
  directoryHref,
  setupTasks,
  activityModules,
  programStarted,
  readOnly = false,
}: LeaderDashboardPanelProps) {
  const highPriorityTasks = setupTasks.filter(
    (task) => task.priority === "high",
  )
  const attentionTasks =
    highPriorityTasks.length > 0 ? highPriorityTasks : setupTasks

  return (
    <div className="flex flex-col gap-6">
      <StatStrip className="justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Stat label="Fellows" value={fellowCount} />
          <Stat label="Mentors" value={mentorCount} />
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={directoryHref} />}
        >
          Open directory
        </Button>
      </StatStrip>

      {attentionTasks.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title={programStarted ? "Needs attention" : "Get your pod ready"}
            description={
              programStarted
                ? "Tackle these before the next check-in."
                : "Complete setup so fellows can start the program."
            }
          />
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {attentionTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                  <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activityModules.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Program progress"
            description="Completion across active modules in this pod."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {activityModules.map((module) => {
              const percent = modulePercent(module.completed, module.total)
              return (
                <Link key={module.id} href={module.href} className="group">
                  <Card className="h-full transition-colors hover:bg-muted/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm">
                          {module.label}
                        </CardTitle>
                        <Badge
                          variant={
                            module.status === "complete"
                              ? "default"
                              : module.status === "inProgress"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {module.status === "complete"
                            ? "Done"
                            : module.status === "inProgress"
                              ? "In progress"
                              : "Not started"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
                        {percent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {module.completed} of {module.total} complete
                      </p>
                      <ProgressBar
                        value={module.completed}
                        max={module.total}
                        aria-label={`${module.label} progress`}
                      />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!readOnly && setupTasks.length > attentionTasks.length ? (
        <section className="flex flex-col gap-4">
          <SectionHeader
            title="All setup items"
            description={`${setupTasks.length} open item${setupTasks.length === 1 ? "" : "s"}`}
          />
          <div className="flex flex-col gap-2">
            {setupTasks.map((task) => (
              <Button
                key={task.id}
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={task.href} />}
                className="justify-between"
              >
                {task.title}
                <ArrowRightIcon className="size-3.5" />
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {attentionTasks.length === 0 && activityModules.length === 0 ? (
        <EmptyState
          title="Pod is set up"
          description="Add fellows and configure activities from the directory and feature pages in the sidebar."
        />
      ) : null}
    </div>
  )
}
