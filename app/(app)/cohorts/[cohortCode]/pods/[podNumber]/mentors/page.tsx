"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"
import { formatDate, formatWeekLabel } from "@/lib/dates"
import { useCohortRoute } from "@/lib/use-cohort-route"

export default function MentorsPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const data = useQuery(
    api.mentors.listAssignments,
    cohortId ? { cohortId } : "skip",
  )
  const createRound = useMutation(api.mentors.createRound)
  const generateAssignments = useMutation(api.mentors.generateAssignments)
  const updateAssignment = useMutation(api.mentors.updateAssignment)

  const [weekLabel, setWeekLabel] = useState("")
  const [weekStart, setWeekStart] = useState("")

  const isLeader = cohort?.canManagePod ?? false
  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer
  const myFellowId = cohort?.fellow?._id
  const mentorMap = new Map(
    (data?.mentors ?? []).map((mentor) => [mentor._id, mentor]),
  )

  if (isLoading || data === undefined) {
    return (
      <>
        <PageHeader
          title="Mentor Meetings"
          description="Assign and track external mentor 1:1s across the program."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching mentor assignments for this pod."
          />
        </PageBody>
      </>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="Mentor Meetings"
          description="Assign and track external mentor 1:1s across the program."
        />
        <PageBody>
          <EmptyState
            title="Cohort not found"
            description="This program code does not match a cohort you can access."
          />
        </PageBody>
      </>
    )
  }

  if (isUmbrellaAdminBlocked) {
    return (
      <>
        <PageHeader
          title="Mentor Meetings"
          description="Assign and track external mentor 1:1s across the program."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Mentor Meetings"
        description="Assign and track external mentor 1:1s across the program."
      />
      <PageBody>
        <Alert>
          <AlertDescription>
            Schedule meetings at least 1 week in advance. Fellows can mark their
            own scheduled and completed status.
          </AlertDescription>
        </Alert>

        {isLeader ? (
          <PageToolbar title="Add a mentor round">
            <div className="flex flex-wrap items-end gap-3">
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={async (event) => {
                  event.preventDefault()
                  try {
                    await createRound({
                      cohortId,
                      targetWeekLabel:
                        weekLabel ||
                        formatWeekLabel(new Date(weekStart).getTime()),
                      targetWeekStart: new Date(weekStart).getTime(),
                    })
                    toast.success("Mentor round added.")
                    setWeekLabel("")
                    setWeekStart("")
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to add round.",
                    )
                  }
                }}
              >
                <Field>
                  <FieldLabel htmlFor="week-label">Week label</FieldLabel>
                  <Input
                    id="week-label"
                    value={weekLabel}
                    onChange={(e) => setWeekLabel(e.target.value)}
                    placeholder="Week of June 30th…"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="week-start">Week start</FieldLabel>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                  />
                </Field>
                <Button type="submit">Add Round</Button>
              </form>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const created = await generateAssignments({ cohortId })
                    toast.success(`Generated ${created} mentor assignments.`)
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to generate assignments.",
                    )
                  }
                }}
              >
                Generate Assignments
              </Button>
            </div>
          </PageToolbar>
        ) : null}

        <section className="rounded-lg border border-border/70 p-4">
          <h3 className="font-medium">Mentor scheduling links</h3>
          {(data?.mentors ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No mentors added yet. Add mentors in Cohort Settings.
            </p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(data?.mentors ?? []).map((mentor) => (
              <li
                key={mentor._id}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{mentor.name}</span>
                <a
                  href={mentor.calendlyUrl}
                  className="truncate text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {mentor.calendlyUrl}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {(data?.fellows ?? []).length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description={
              isLeader
                ? "Add fellows in Cohort Settings to assign and track mentor meetings."
                : "Your pod leader hasn't added fellows to this cohort yet."
            }
            action={
              isLeader ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={cohortPath(
                        settingsProgramCode ?? cohort?.cohort.programCode ?? "",
                        "settings",
                      )}
                    />
                  }
                >
                  Go to Cohort Settings
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fellow</TableHead>
                  {(data?.rounds ?? []).map((round) => (
                    <TableHead key={round._id} colSpan={3}>
                      {round.targetWeekLabel}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead />
                  {(data?.rounds ?? []).flatMap((round) => [
                    <TableHead key={`${round._id}-mentor`}>Mentor</TableHead>,
                    <TableHead key={`${round._id}-scheduled`}>
                      Scheduled
                    </TableHead>,
                    <TableHead key={`${round._id}-completed`}>
                      Completed
                    </TableHead>,
                  ])}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.fellows ?? []).map((fellow) => (
                  <TableRow key={fellow._id}>
                    <TableCell className="font-medium">{fellow.name}</TableCell>
                    {(data?.rounds ?? []).flatMap((round) => {
                      const assignment = data?.assignments.find(
                        (item) =>
                          item.fellowId === fellow._id &&
                          item.roundId === round._id,
                      )
                      const mentor = assignment
                        ? mentorMap.get(assignment.mentorId)
                        : undefined
                      const editable = isLeader || myFellowId === fellow._id

                      return [
                        <TableCell key={`${round._id}-${fellow._id}-mentor`}>
                          {mentor?.name ?? "—"}
                        </TableCell>,
                        <TableCell key={`${round._id}-${fellow._id}-scheduled`}>
                          <Checkbox
                            checked={assignment?.scheduled ?? false}
                            disabled={!editable || !assignment}
                            aria-label={`Scheduled ${fellow.name} ${round.targetWeekLabel}`}
                            onCheckedChange={(checked) => {
                              if (!assignment) return
                              void updateAssignment({
                                cohortId,
                                assignmentId: assignment._id,
                                scheduled: checked === true,
                              }).then(
                                () =>
                                  toast.success("Scheduled status updated."),
                                (error: unknown) =>
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Update failed.",
                                  ),
                              )
                            }}
                          />
                        </TableCell>,
                        <TableCell key={`${round._id}-${fellow._id}-completed`}>
                          <Checkbox
                            checked={assignment?.completed ?? false}
                            disabled={!editable || !assignment}
                            aria-label={`Completed ${fellow.name} ${round.targetWeekLabel}`}
                            onCheckedChange={(checked) => {
                              if (!assignment) return
                              void updateAssignment({
                                cohortId,
                                assignmentId: assignment._id,
                                completed: checked === true,
                              }).then(
                                () =>
                                  toast.success("Completed status updated."),
                                (error: unknown) =>
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Update failed.",
                                  ),
                              )
                            }}
                          />
                        </TableCell>,
                      ]
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {(data?.rounds ?? []).length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Rounds:{" "}
            {(data?.rounds ?? [])
              .map((round) => formatDate(round.targetWeekStart))
              .join(" · ")}
          </p>
        ) : null}
      </PageBody>
    </>
  )
}
