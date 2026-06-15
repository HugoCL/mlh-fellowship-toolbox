"use client"

import { ArrowRightIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg ring-1 ring-foreground/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UsersIcon className="size-4" aria-hidden="true" />
            <span>In this pod</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Fellows</span>
            <span className="font-heading text-2xl font-semibold tabular-nums">
              {fellowCount}
            </span>
          </div>
          <div
            className="hidden h-4 w-px bg-border sm:block"
            aria-hidden="true"
          />
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Mentors</span>
            <span className="font-heading text-2xl font-semibold tabular-nums">
              {mentorCount}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={directoryHref} />}
        >
          Open directory
        </Button>
      </div>

      {attentionTasks.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              {programStarted ? "Needs attention" : "Get your pod ready"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {programStarted
                ? "Tackle these before the next check-in."
                : "Complete setup so fellows can start the program."}
            </p>
          </div>
          <ul className="divide-y divide-border/70 rounded-lg ring-1 ring-foreground/10">
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
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Program progress
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Completion across active modules in this pod.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
                      <p className="font-heading text-2xl font-semibold tabular-nums">
                        {percent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {module.completed} of {module.total} complete
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!readOnly && setupTasks.length > attentionTasks.length ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              All setup items
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {setupTasks.length} open item
              {setupTasks.length === 1 ? "" : "s"}
            </p>
          </div>
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
        <Card>
          <CardHeader>
            <CardTitle>Pod is set up</CardTitle>
            <CardDescription>
              Add fellows and configure activities from the directory and
              feature pages in the sidebar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  )
}
