"use client"

import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Info, PencilIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { MentorProfileEditDialog } from "@/components/app/mentor-profile-edit-dialog"
import {
  ManageableWeekSlotList,
  runGenerateAllWeeks,
} from "@/components/app/manageable-week-slot-list"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  formatWeekDateRange,
  formatWeekLabel,
  PROGRAM_TIMEZONE_LABEL,
  parseProgramDate,
} from "@/lib/dates"
import { type OneOnOneStatus, StatusBadge } from "@/lib/status"
import { useCohortRoute } from "@/lib/use-cohort-route"

function mentorMeetingStatus(
  scheduled: boolean,
  completed: boolean,
): OneOnOneStatus {
  if (completed) return "completed"
  if (scheduled) return "scheduled"
  return "notStarted"
}

export default function MentorsPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()

  const isImpersonating = cohort?.impersonation != null
  const showLeaderView = cohort
    ? !isImpersonating && (cohort.canManagePod || cohort.isUmbrellaViewer)
    : false

  const leaderData = useQuery(
    api.mentors.listAssignments,
    cohortId && showLeaderView ? { cohortId } : "skip",
  )
  const fellowData = useQuery(
    api.mentors.getMyMentorMeetings,
    cohortId && cohort && !showLeaderView ? { cohortId } : "skip",
  )

  const createRound = useMutation(api.mentors.createRound)
  const generateAllRounds = useMutation(api.mentors.generateAllRounds)
  const updateRound = useMutation(api.mentors.updateRound)
  const deleteRound = useMutation(api.mentors.deleteRound)
  const generateAssignments = useMutation(api.mentors.generateAssignments)
  const updateAssignment = useMutation(api.mentors.updateAssignment)
  const updateMentorProfile = useMutation(api.mentors.updateMentorProfile)

  const [weekLabel, setWeekLabel] = useState("")
  const [weekStart, setWeekStart] = useState("")
  const [editingMentorId, setEditingMentorId] =
    useState<Id<"mentors"> | null>(null)

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  const dataLoading = showLeaderView
    ? leaderData === undefined
    : fellowData === undefined

  if (isLoading || (cohortId && cohort && dataLoading)) {
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

  if (!showLeaderView) {
    return (
      <FellowMentorMeetingsView
        cohortId={cohortId}
        fellowData={fellowData ?? { assignments: [], mentors: [], rounds: [] }}
        updateAssignment={updateAssignment}
      />
    )
  }

  const data = leaderData!
  const mentorMap = new Map(
    (data.mentors ?? []).map((mentor) => [mentor._id, mentor]),
  )
  const editingMentor = editingMentorId
    ? mentorMap.get(editingMentorId)
    : undefined

  return (
    <>
      <PageHeader
        title="Mentor Meetings"
        description="Assign and track external mentor 1:1s across the program."
      />
      <PageBody>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Schedule meetings at least 1 week in advance. Fellows can mark their
            own scheduled and completed status.
          </span>
        </p>

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
                      weekLabel || formatWeekLabel(parseProgramDate(weekStart)),
                    targetWeekStart: parseProgramDate(weekStart),
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
                <FieldLabel htmlFor="week-start">
                  Week start ({PROGRAM_TIMEZONE_LABEL})
                </FieldLabel>
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
              onClick={() =>
                void runGenerateAllWeeks(
                  () => generateAllRounds({ cohortId }),
                  "mentor round",
                )
              }
            >
              Generate All Weeks
            </Button>
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

        <ManageableWeekSlotList
          title="Mentor meeting weeks"
          description="Program weeks for mentor 1:1 rounds. Edit dates or remove weeks you do not need."
          dateDisplay="weekRange"
          slots={(data.rounds ?? []).map((round) => ({
            id: round._id,
            label: round.targetWeekLabel,
            date: round.targetWeekStart,
          }))}
          onUpdate={async (roundId, values) => {
            await updateRound({
              cohortId,
              roundId: roundId as Id<"mentorMeetingRounds">,
              targetWeekLabel: values.label,
              targetWeekStart: values.date,
            })
          }}
          onDelete={async (roundId) => {
            await deleteRound({
              cohortId,
              roundId: roundId as Id<"mentorMeetingRounds">,
            })
          }}
          deleteDescription="This removes the week and any mentor assignments for it. Regenerate assignments afterward if needed."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mentor profiles</CardTitle>
            <CardDescription>
              Scheduling links and Discord usernames for fellows to reach
              mentors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(data.mentors ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mentors added yet. Add mentors in the Directory.
              </p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {(data.mentors ?? []).map((mentor) => (
                  <li
                    key={mentor._id}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{mentor.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mentor.calendlyUrl
                          ? "Scheduling link set"
                          : "Scheduling link missing"}
                        {" · "}
                        {mentor.discordUsername
                          ? `@${mentor.discordUsername.replace(/^@+/, "")}`
                          : "Discord not set"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start sm:self-center"
                      onClick={() => setEditingMentorId(mentor._id)}
                    >
                      <PencilIcon data-icon="inline-start" />
                      Edit profile
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {editingMentor ? (
          <MentorProfileEditDialog
            open={editingMentor != null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingMentorId(null)
              }
            }}
            mentorName={editingMentor.name}
            calendlyUrl={editingMentor.calendlyUrl.trim() || null}
            discordUsername={editingMentor.discordUsername?.trim() || null}
            onSave={async (values) => {
              await updateMentorProfile({
                cohortId,
                mentorId: editingMentor._id,
                calendlyUrl: values.calendlyUrl,
                discordUsername: values.discordUsername,
              })
            }}
          />
        ) : null}

        {(data.fellows ?? []).length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description="Add fellows in Cohort Settings to assign and track mentor meetings."
            action={
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={cohortPath(
                      settingsProgramCode ?? cohort.cohort.programCode ?? "",
                      "settings",
                    )}
                  />
                }
              >
                Go to Cohort Settings
              </Button>
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Mentor assignment matrix
              </CardTitle>
              <CardDescription>
                Fellow mentor pairings by program round. Fellows can update
                their own scheduled and completed checkboxes.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-auto border-t border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 z-20 bg-card">
                        Fellow
                      </TableHead>
                      {(data.rounds ?? []).map((round) => (
                        <TableHead key={round._id} colSpan={3}>
                          {round.targetWeekLabel}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 z-20 bg-card" />
                      {(data.rounds ?? []).flatMap((round) => [
                        <TableHead key={`${round._id}-mentor`}>
                          Mentor
                        </TableHead>,
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
                    {(data.fellows ?? []).map((fellow) => (
                      <TableRow key={fellow._id} className="group">
                        <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/50">
                          {fellow.name}
                        </TableCell>
                        {(data.rounds ?? []).flatMap((round) => {
                          const assignment = data.assignments.find(
                            (item) =>
                              item.fellowId === fellow._id &&
                              item.roundId === round._id,
                          )
                          const mentor = assignment
                            ? mentorMap.get(assignment.mentorId)
                            : undefined

                          return [
                            <TableCell
                              key={`${round._id}-${fellow._id}-mentor`}
                            >
                              {mentor?.name ?? "—"}
                            </TableCell>,
                            <TableCell
                              key={`${round._id}-${fellow._id}-scheduled`}
                            >
                              <Checkbox
                                checked={assignment?.scheduled ?? false}
                                disabled={!assignment}
                                aria-label={`Scheduled ${fellow.name} ${round.targetWeekLabel}`}
                                onCheckedChange={(checked) => {
                                  if (!assignment) return
                                  void updateAssignment({
                                    cohortId,
                                    assignmentId: assignment._id,
                                    scheduled: checked === true,
                                  }).then(
                                    () =>
                                      toast.success(
                                        "Scheduled status updated.",
                                      ),
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
                            <TableCell
                              key={`${round._id}-${fellow._id}-completed`}
                            >
                              <Checkbox
                                checked={assignment?.completed ?? false}
                                disabled={!assignment}
                                aria-label={`Completed ${fellow.name} ${round.targetWeekLabel}`}
                                onCheckedChange={(checked) => {
                                  if (!assignment) return
                                  void updateAssignment({
                                    cohortId,
                                    assignmentId: assignment._id,
                                    completed: checked === true,
                                  }).then(
                                    () =>
                                      toast.success(
                                        "Completed status updated.",
                                      ),
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
            </CardContent>
          </Card>
        )}

        {(data.rounds ?? []).length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Rounds:{" "}
            {(data.rounds ?? [])
              .map((round) => formatWeekDateRange(round.targetWeekStart))
              .join(" · ")}
          </p>
        ) : null}
      </PageBody>
    </>
  )
}

type FellowMentorData = {
  assignments: Array<{
    _id: Id<"mentorMeetingAssignments">
    mentorId: Id<"mentors">
    roundId: Id<"mentorMeetingRounds">
    scheduled: boolean
    completed: boolean
  }>
  mentors: Array<{
    _id: Id<"mentors">
    name: string
    calendlyUrl: string
  }>
  rounds: Array<{
    _id: Id<"mentorMeetingRounds">
    targetWeekLabel: string
    targetWeekStart: number
    roundNumber: number
  }>
}

function FellowMentorMeetingsView({
  cohortId,
  fellowData,
  updateAssignment,
}: {
  cohortId: Id<"cohorts">
  fellowData: FellowMentorData
  updateAssignment: (args: {
    cohortId: Id<"cohorts">
    assignmentId: Id<"mentorMeetingAssignments">
    scheduled?: boolean
    completed?: boolean
  }) => Promise<unknown>
}) {
  const mentorMap = new Map(
    fellowData.mentors.map((mentor) => [mentor._id, mentor]),
  )
  const roundMap = new Map(fellowData.rounds.map((round) => [round._id, round]))

  const sortedAssignments = [...fellowData.assignments].sort((a, b) => {
    const roundA = roundMap.get(a.roundId)
    const roundB = roundMap.get(b.roundId)
    return (roundA?.roundNumber ?? 0) - (roundB?.roundNumber ?? 0)
  })

  const pendingAssignments = sortedAssignments.filter(
    (assignment) => !assignment.completed,
  )

  const assignedMentorIds = new Set(
    sortedAssignments.map((assignment) => assignment.mentorId),
  )
  const assignedMentors = fellowData.mentors.filter((mentor) =>
    assignedMentorIds.has(mentor._id),
  )

  async function setScheduled(
    assignmentId: Id<"mentorMeetingAssignments">,
    scheduled: boolean,
  ) {
    try {
      await updateAssignment({ cohortId, assignmentId, scheduled })
      toast.success("Scheduled status updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  async function setCompleted(
    assignmentId: Id<"mentorMeetingAssignments">,
    completed: boolean,
  ) {
    try {
      await updateAssignment({ cohortId, assignmentId, completed })
      toast.success("Completed status updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  return (
    <>
      <PageHeader
        title="Mentor Meetings"
        description="Your assigned mentor 1:1s and scheduling links."
      />
      <PageBody>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Book each mentor 1:1 at least 1 week ahead, then mark{" "}
            <span className="font-medium text-foreground">Scheduled</span> and{" "}
            <span className="font-medium text-foreground">Completed</span> when
            done.
          </span>
        </p>

        {sortedAssignments.length === 0 ? (
          <EmptyState
            title="No mentor meetings yet"
            description="Your pod leader hasn't assigned mentor 1:1s for you yet. Check back once rounds are set up."
          />
        ) : (
          <>
            {pendingAssignments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Up next</CardTitle>
                  <CardDescription>
                    {pendingAssignments.length === 1
                      ? "1 mentor meeting still needs your attention."
                      : `${pendingAssignments.length} mentor meetings still need your attention.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {pendingAssignments.map((assignment) => {
                    const mentor = mentorMap.get(assignment.mentorId)
                    const round = roundMap.get(assignment.roundId)
                    const status = mentorMeetingStatus(
                      assignment.scheduled,
                      assignment.completed,
                    )
                    return (
                      <div
                        key={assignment._id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {mentor?.name ?? "Mentor"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {round?.targetWeekLabel ?? "Program round"}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your mentor 1:1s</CardTitle>
                <CardDescription>
                  One row per program round. Update status after you book and
                  complete each meeting.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="divide-y divide-border/60 border-t border-border/60">
                  {sortedAssignments.map((assignment) => {
                    const mentor = mentorMap.get(assignment.mentorId)
                    const round = roundMap.get(assignment.roundId)
                    const status = mentorMeetingStatus(
                      assignment.scheduled,
                      assignment.completed,
                    )

                    return (
                      <div
                        key={assignment._id}
                        className="flex flex-col gap-4 px-(--card-spacing) py-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">
                              {mentor?.name ?? "Mentor"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {round?.targetWeekLabel ?? "Program round"}
                              {round
                                ? ` · ${formatWeekDateRange(round.targetWeekStart)}`
                                : null}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={status} />
                            {mentor?.calendlyUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                nativeButton={false}
                                render={
                                  <Link
                                    href={mentor.calendlyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Schedule with ${mentor.name}`}
                                  />
                                }
                              >
                                Schedule
                                <ExternalLink aria-hidden="true" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <div className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={assignment.scheduled}
                              aria-label={`Scheduled with ${mentor?.name ?? "mentor"}`}
                              onCheckedChange={(checked) => {
                                void setScheduled(
                                  assignment._id,
                                  checked === true,
                                )
                              }}
                            />
                            Scheduled
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={assignment.completed}
                              aria-label={`Completed with ${mentor?.name ?? "mentor"}`}
                              onCheckedChange={(checked) => {
                                void setCompleted(
                                  assignment._id,
                                  checked === true,
                                )
                              }}
                            />
                            Completed
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {assignedMentors.some((mentor) => mentor.calendlyUrl) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scheduling links</CardTitle>
                  <CardDescription>
                    Scheduling links for mentors assigned to you.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {assignedMentors.map((mentor) =>
                      mentor.calendlyUrl ? (
                        <div
                          key={mentor._id}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
                        >
                          <span className="truncate text-sm font-medium">
                            {mentor.name}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <Link
                                href={mentor.calendlyUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open scheduling link for ${mentor.name}`}
                              />
                            }
                          >
                            Open scheduling link
                            <ExternalLink aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null,
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </PageBody>
    </>
  )
}
