"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LabeledCheckbox } from "@/components/app/labeled-checkbox"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { cohortPath } from "@/lib/cohort-routes"
import { formatDate } from "@/lib/dates"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { getStatusLabel } from "@/lib/status"

export default function MyTasksPageClient() {
  const searchParams = useSearchParams()
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const requestedCohortCode = searchParams.get("cohort")
  const activeCohortEntry =
    cohorts?.find((item) => item.cohort.programCode === requestedCohortCode) ??
    cohorts?.[0]
  const cohortId = activeCohortEntry?.cohort._id
  const cohortDetails = useQuery(
    api.cohorts.getCohort,
    cohortId ? { cohortId } : "skip",
  )

  const oneOnOnes = useQuery(
    api.oneOnOnes.getMyOneOnOnes,
    cohortId ? { cohortId } : "skip",
  )
  const mentors = useQuery(
    api.mentors.getMyMentorMeetings,
    cohortId ? { cohortId } : "skip",
  )
  const demoDay = useQuery(
    api.demoDays.getMyDemoDay,
    cohortId ? { cohortId } : "skip",
  )
  const lightningTalk = useQuery(
    api.lightningTalks.getMyLightningTalk,
    cohortId ? { cohortId } : "skip",
  )
  const fellows = useQuery(
    api.fellows.listFellows,
    cohortId ? { cohortId } : "skip",
  )

  const updatePeerStatus = useMutation(api.oneOnOnes.updatePeerStatus)
  const updateLeaderStatus = useMutation(api.oneOnOnes.updateLeaderStatus)
  const updateAssignment = useMutation(api.mentors.updateAssignment)
  const updateDemoCompletion = useMutation(api.demoDays.updateDemoCompletion)
  const updateTalkCompletion = useMutation(
    api.lightningTalks.updateTalkCompletion,
  )
  const updateFellowCalendly = useMutation(api.fellows.updateMyCalendly)

  const fellowMap = new Map(
    (fellows ?? []).map((fellow) => [fellow._id, fellow]),
  )
  const mentorMap = new Map(
    (mentors?.mentors ?? []).map((mentor) => [mentor._id, mentor]),
  )
  const roundMap = new Map(
    (mentors?.rounds ?? []).map((round) => [round._id, round]),
  )

  if (cohorts === undefined || (cohortId && cohortDetails === undefined)) {
    return (
      <>
        <PageHeader title="My Tasks" description="Loading your checklist…" />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (!activeCohortEntry || !cohortDetails) {
    return (
      <>
        <PageHeader
          title="My Tasks"
          description="Your personal fellowship checklist."
        />
        <PageBody>
          <p className="text-sm text-muted-foreground">
            Join a cohort to see your tasks.
          </p>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My Tasks"
        description={`Personal checklist for ${activeCohortEntry.cohort.name}.`}
        actions={
          cohortId ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={cohortPath(
                    activeCohortEntry.cohort.programCode,
                    "one-on-ones",
                  )}
                />
              }
            >
              Open Full Tracker
            </Button>
          ) : null
        }
      />
      <PageBody>
        {cohortId && cohortDetails.fellow ? (
          <SchedulingLinkSetup
            key={cohortDetails.fellow.calendlyUrl}
            fieldId="scheduling-link-fellow"
            calendlyUrl={cohortDetails.fellow.calendlyUrl}
            variant={
              hasSchedulingLink(cohortDetails.fellow.calendlyUrl)
                ? "default"
                : "action"
            }
            onSave={async (url) => {
              await updateFellowCalendly({ cohortId, calendlyUrl: url })
            }}
          />
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">Peer 1:1s</h2>
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {(oneOnOnes?.peerPairs ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No peer 1:1s assigned yet.
              </p>
            ) : null}
            {(oneOnOnes?.peerPairs ?? []).map((pair) => {
              const otherId =
                pair.fellowAId === cohortDetails.fellow?._id
                  ? pair.fellowBId
                  : pair.fellowAId
              const other = fellowMap.get(otherId)
              return (
                <div
                  key={pair._id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{other?.name ?? "Podmate"}</p>
                    {other?.calendlyUrl ? (
                      <a
                        href={other.calendlyUrl}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Book meeting
                      </a>
                    ) : null}
                  </div>
                  <Select
                    value={pair.status}
                    onValueChange={(value) => {
                      if (!value || !cohortId) return
                      void updatePeerStatus({
                        cohortId,
                        fellowAId: pair.fellowAId,
                        fellowBId: pair.fellowBId,
                        status: value,
                      })
                    }}
                  >
                    <SelectTrigger
                      className="w-40"
                      aria-label={`Peer 1:1 with ${other?.name ?? "podmate"}`}
                    >
                      <SelectValue>{getStatusLabel(pair.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="notStarted">Not yet</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">
            Pod leader 1:1s
          </h2>
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {(oneOnOnes?.leaderRecords ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No pod leader 1:1s scheduled yet.
              </p>
            ) : null}
            {(oneOnOnes?.leaderRecords ?? []).map((record) => {
              const instance = oneOnOnes?.instances.find(
                (item) => item._id === record.instanceId,
              )
              return (
                <div
                  key={record._id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span>{instance?.title ?? "Leader 1:1"}</span>
                  <Select
                    value={record.status}
                    onValueChange={(value) => {
                      if (!value || !cohortId || !cohortDetails.fellow) return
                      void updateLeaderStatus({
                        cohortId,
                        fellowId: cohortDetails.fellow._id,
                        instanceId: record.instanceId,
                        status: value,
                      })
                    }}
                  >
                    <SelectTrigger
                      className="w-40"
                      aria-label={instance?.title ?? "Leader 1:1"}
                    >
                      <SelectValue>{getStatusLabel(record.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="notStarted">Not yet</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">
            Mentor meetings
          </h2>
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {(mentors?.assignments ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No mentor meetings assigned yet.
              </p>
            ) : null}
            {(mentors?.assignments ?? []).map((assignment) => {
              const mentor = mentorMap.get(assignment.mentorId)
              const round = roundMap.get(assignment.roundId)
              return (
                <div
                  key={assignment._id}
                  className="flex flex-col gap-3 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{mentor?.name ?? "Mentor"}</p>
                      <p className="text-sm text-muted-foreground">
                        {round?.targetWeekLabel}
                      </p>
                    </div>
                    {mentor?.calendlyUrl ? (
                      <a
                        href={mentor.calendlyUrl}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Schedule meeting
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-6">
                    <LabeledCheckbox
                      id={`mentor-sched-${assignment._id}`}
                      label="Scheduled"
                      checked={assignment.scheduled}
                      ariaLabel={`Scheduled with ${mentor?.name ?? "mentor"}`}
                      onCheckedChange={(checked) => {
                        if (!cohortId) return
                        void updateAssignment({
                          cohortId,
                          assignmentId: assignment._id,
                          scheduled: checked,
                        })
                      }}
                    />
                    <LabeledCheckbox
                      id={`mentor-done-${assignment._id}`}
                      label="Completed"
                      checked={assignment.completed}
                      ariaLabel={`Completed with ${mentor?.name ?? "mentor"}`}
                      onCheckedChange={(checked) => {
                        if (!cohortId) return
                        void updateAssignment({
                          cohortId,
                          assignmentId: assignment._id,
                          completed: checked,
                        })
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/70 p-4">
            <h3 className="font-medium">Demo day</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {demoDay
                ? formatDate(demoDay.demoDate)
                : "No demo date assigned yet."}
            </p>
            {demoDay ? (
              <LabeledCheckbox
                id="demo-completed"
                label="Completed demo"
                className="mt-4 flex items-center gap-2 text-sm"
                checked={demoDay.completed}
                ariaLabel="Completed demo day"
                onCheckedChange={(checked) => {
                  if (!cohortId) return
                  void updateDemoCompletion({
                    cohortId,
                    demoDayId: demoDay._id,
                    completed: checked,
                  })
                }}
              />
            ) : null}
          </div>

          <div className="rounded-lg border border-border/70 p-4">
            <h3 className="font-medium">Lightning talk</h3>
            {lightningTalk ? (
              <>
                <p className="mt-2 text-sm">{lightningTalk.topic}</p>
                <LabeledCheckbox
                  id="talk-completed"
                  label="Completed talk"
                  className="mt-4 flex items-center gap-2 text-sm"
                  checked={lightningTalk.completed}
                  ariaLabel="Completed lightning talk"
                  onCheckedChange={(checked) => {
                    if (!cohortId) return
                    void updateTalkCompletion({
                      cohortId,
                      talkId: lightningTalk._id,
                      completed: checked,
                    })
                  }}
                />
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No talk enrolled yet. Visit the Lightning Talks page to sign up.
              </p>
            )}
          </div>
        </section>
      </PageBody>
    </>
  )
}
