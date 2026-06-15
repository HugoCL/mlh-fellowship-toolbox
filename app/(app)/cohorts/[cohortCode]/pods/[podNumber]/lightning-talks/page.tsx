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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { formatDate } from "@/lib/dates"
import { useCohortRoute } from "@/lib/use-cohort-route"

export default function LightningTalksPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const data = useQuery(
    api.lightningTalks.listLightningTalks,
    cohortId ? { cohortId } : "skip",
  )
  const createSlot = useMutation(api.lightningTalks.createSlot)
  const enroll = useMutation(api.lightningTalks.enroll)
  const assignTalk = useMutation(api.lightningTalks.assignTalk)
  const updateTalkCompletion = useMutation(
    api.lightningTalks.updateTalkCompletion,
  )

  const [slotDate, setSlotDate] = useState("")
  const [topic, setTopic] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [assignFellowId, setAssignFellowId] = useState<string>("")
  const [assignTopic, setAssignTopic] = useState("")

  const isLeader = cohort?.canManagePod ?? false
  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer
  const myFellowId = cohort?.fellow?._id
  const talkMap = new Map(
    (data?.talks ?? []).map((talk) => [talk.fellowId, talk]),
  )
  const slotMap = new Map((data?.slots ?? []).map((slot) => [slot._id, slot]))

  if (isLoading || data === undefined) {
    return (
      <>
        <PageHeader
          title="Lightning Talks"
          description="Schedule short technical talks and track completion."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching lightning talk data for this pod."
          />
        </PageBody>
      </>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="Lightning Talks"
          description="Schedule short technical talks and track completion."
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
          title="Lightning Talks"
          description="Schedule short technical talks and track completion."
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
        title="Lightning Talks"
        description="Schedule short technical talks and track completion."
      />
      <PageBody>
        <Alert>
          <AlertDescription>
            Present any technical topic you like in a 5–15 minute talk.
            Non-technical topics are welcome too.
          </AlertDescription>
        </Alert>

        {isLeader ? (
          <PageToolbar title="Add a talk slot">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (event) => {
                event.preventDefault()
                try {
                  await createSlot({
                    cohortId,
                    slotDate: new Date(slotDate).getTime(),
                  })
                  toast.success("Lightning talk slot created.")
                  setSlotDate("")
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to create slot.",
                  )
                }
              }}
            >
              <Field>
                <FieldLabel htmlFor="slot-date">Slot date</FieldLabel>
                <Input
                  id="slot-date"
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
              </Field>
              <Button type="submit">Add Slot</Button>
            </form>
          </PageToolbar>
        ) : null}

        {!isLeader && cohort?.fellow ? (
          <form
            className="rounded-lg border border-border/70 p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await enroll({
                  cohortId,
                  slotId: selectedSlot as Id<"lightningTalkSlots">,
                  topic,
                })
                toast.success("Enrolled in lightning talk.")
                setTopic("")
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Enrollment failed.",
                )
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="enroll-slot">Choose a slot</FieldLabel>
                <Select
                  value={selectedSlot}
                  onValueChange={(value) => value && setSelectedSlot(value)}
                >
                  <SelectTrigger id="enroll-slot">
                    <SelectValue placeholder="Select date…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(data?.slots ?? []).map((slot) => (
                        <SelectItem key={slot._id} value={slot._id}>
                          {formatDate(slot.slotDate)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="enroll-topic">Topic</FieldLabel>
                <Input
                  id="enroll-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Intro to AWS…"
                />
              </Field>
              <Button type="submit" className="self-start">
                Enroll
              </Button>
            </FieldGroup>
          </form>
        ) : null}

        {isLeader ? (
          <form
            className="rounded-lg border border-border/70 p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await assignTalk({
                  cohortId,
                  fellowId: assignFellowId as Id<"fellows">,
                  slotId: selectedSlot as Id<"lightningTalkSlots">,
                  topic: assignTopic,
                })
                toast.success("Lightning talk assigned.")
                setAssignTopic("")
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Assignment failed.",
                )
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="assign-fellow">Fellow</FieldLabel>
                <Select
                  value={assignFellowId}
                  onValueChange={(value) => value && setAssignFellowId(value)}
                >
                  <SelectTrigger id="assign-fellow">
                    <SelectValue placeholder="Select fellow…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(data?.fellows ?? []).map((fellow) => (
                        <SelectItem key={fellow._id} value={fellow._id}>
                          {fellow.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="assign-slot">Slot</FieldLabel>
                <Select
                  value={selectedSlot}
                  onValueChange={(value) => value && setSelectedSlot(value)}
                >
                  <SelectTrigger id="assign-slot">
                    <SelectValue placeholder="Select slot…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(data?.slots ?? []).map((slot) => (
                        <SelectItem key={slot._id} value={slot._id}>
                          {formatDate(slot.slotDate)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="assign-topic">Topic</FieldLabel>
                <Input
                  id="assign-topic"
                  value={assignTopic}
                  onChange={(e) => setAssignTopic(e.target.value)}
                />
              </Field>
              <Button type="submit" className="self-start">
                Assign Talk
              </Button>
            </FieldGroup>
          </form>
        ) : null}

        {(data?.fellows ?? []).length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description={
              isLeader
                ? "Add fellows in Cohort Settings before scheduling talks."
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
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.fellows ?? []).map((fellow) => {
                  const talk = talkMap.get(fellow._id)
                  const slot = talk ? slotMap.get(talk.slotId) : undefined
                  const editable = isLeader || myFellowId === fellow._id

                  return (
                    <TableRow key={fellow._id}>
                      <TableCell className="font-medium">
                        {fellow.name}
                      </TableCell>
                      <TableCell>
                        {slot ? formatDate(slot.slotDate) : "—"}
                      </TableCell>
                      <TableCell>{talk?.topic ?? "—"}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={talk?.completed ?? false}
                          disabled={!editable || !talk}
                          aria-label={`Completed lightning talk for ${fellow.name}`}
                          onCheckedChange={(checked) => {
                            if (!talk) return
                            void updateTalkCompletion({
                              cohortId,
                              talkId: talk._id,
                              completed: checked === true,
                            }).then(
                              () => toast.success("Talk status updated."),
                              (error: unknown) =>
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Update failed.",
                                ),
                            )
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  )
}
