"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import {
  ManageableWeekSlotList,
  runGenerateAllWeeks,
} from "@/components/app/manageable-week-slot-list"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
import {
  PageSkeleton,
  SkeletonList,
  SkeletonTable,
} from "@/components/app/page-skeleton"
import { SectionHeader } from "@/components/app/section-header"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  formatDate,
  getProgramWeekday,
  PROGRAM_TIMEZONE_LABEL,
  parseProgramDate,
} from "@/lib/dates"
import type { Weekday } from "@/lib/programWeeks"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { getWeekdayLabel, WEEKDAY_OPTIONS } from "@/lib/weekdays"

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
  const generateAllSlots = useMutation(api.lightningTalks.generateAllSlots)
  const updateSlot = useMutation(api.lightningTalks.updateSlot)
  const deleteSlot = useMutation(api.lightningTalks.deleteSlot)
  const enroll = useMutation(api.lightningTalks.enroll)
  const assignTalk = useMutation(api.lightningTalks.assignTalk)
  const updateTalkCompletion = useMutation(
    api.lightningTalks.updateTalkCompletion,
  )

  const [slotDate, setSlotDate] = useState("")
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateDayOfWeek, setGenerateDayOfWeek] = useState<Weekday>(0)
  const [isGenerating, setIsGenerating] = useState(false)
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
  const fellowMap = new Map(
    (data?.fellows ?? []).map((fellow) => [fellow._id, fellow]),
  )
  const slotMap = new Map((data?.slots ?? []).map((slot) => [slot._id, slot]))
  const registeredTalks = (data?.talks ?? [])
    .flatMap((talk) => {
      const fellow = fellowMap.get(talk.fellowId)
      if (!fellow) {
        return []
      }
      return [{ talk, fellow, slot: slotMap.get(talk.slotId) }]
    })
    .sort(
      (a, b) =>
        (a.slot?.slotDate ?? Number.MAX_SAFE_INTEGER) -
        (b.slot?.slotDate ?? Number.MAX_SAFE_INTEGER),
    )
  const myTalk = myFellowId
    ? registeredTalks.find((entry) => entry.talk.fellowId === myFellowId)?.talk
    : undefined
  const unregisteredFellows = (data?.fellows ?? []).filter(
    (fellow) =>
      !registeredTalks.some((entry) => entry.talk.fellowId === fellow._id),
  )
  const selectedSlotEntry = selectedSlot
    ? slotMap.get(selectedSlot as Id<"lightningTalkSlots">)
    : undefined
  const assignFellowName = assignFellowId
    ? fellowMap.get(assignFellowId as Id<"fellows">)?.name
    : undefined

  if (isLoading || data === undefined) {
    return (
      <PageSkeleton
        title="Lightning Talks"
        description="Schedule short technical talks and track completion."
        width="wide"
      >
        <SkeletonList count={2} />
        <SkeletonTable rows={5} columns={4} />
      </PageSkeleton>
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
      <PageBody width="wide">
        <InfoCallout variant="info">
          Present any technical topic you like in a 5–15 minute talk.
          Non-technical topics are welcome too.
        </InfoCallout>

        {isLeader ? (
          <>
            <PageToolbar title="Add a talk slot">
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={async (event) => {
                  event.preventDefault()
                  try {
                    await createSlot({
                      cohortId,
                      slotDate: parseProgramDate(slotDate),
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
                  <FieldLabel htmlFor="slot-date">
                    Slot date ({PROGRAM_TIMEZONE_LABEL})
                  </FieldLabel>
                  <Input
                    id="slot-date"
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                  />
                </Field>
                <Button type="submit">Add Slot</Button>
              </form>
              <Button
                variant="outline"
                onClick={() => {
                  setGenerateDayOfWeek(
                    getProgramWeekday(cohort.cohort.startDate),
                  )
                  setGenerateDialogOpen(true)
                }}
              >
                Generate All Weeks
              </Button>
              <Dialog
                open={generateDialogOpen}
                onOpenChange={setGenerateDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate talk slots</DialogTitle>
                    <DialogDescription>
                      Create one lightning talk slot per program week on the
                      selected day.
                    </DialogDescription>
                  </DialogHeader>
                  <Field>
                    <FieldLabel htmlFor="generate-day-of-week">
                      Day of week
                    </FieldLabel>
                    <Select
                      value={String(generateDayOfWeek)}
                      onValueChange={(value) => {
                        if (value) {
                          setGenerateDayOfWeek(Number(value) as Weekday)
                        }
                      }}
                    >
                      <SelectTrigger
                        id="generate-day-of-week"
                        className="w-full"
                      >
                        <SelectValue>
                          {getWeekdayLabel(generateDayOfWeek)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {WEEKDAY_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setGenerateDialogOpen(false)}
                      disabled={isGenerating}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={isGenerating}
                      onClick={() => {
                        setIsGenerating(true)
                        void runGenerateAllWeeks(
                          () =>
                            generateAllSlots({
                              cohortId,
                              dayOfWeek: generateDayOfWeek,
                            }),
                          "talk slot",
                        ).finally(() => {
                          setIsGenerating(false)
                          setGenerateDialogOpen(false)
                        })
                      }}
                    >
                      Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </PageToolbar>

            <ManageableWeekSlotList
              title="Lightning talk weeks"
              description="One slot per program week. Remove enrolled talks before deleting a slot."
              slots={(data?.slots ?? []).map((slot) => ({
                id: slot._id,
                label: formatDate(slot.slotDate),
                date: slot.slotDate,
              }))}
              showLabelField={false}
              onUpdate={async (slotId, values) => {
                await updateSlot({
                  cohortId,
                  slotId: slotId as Id<"lightningTalkSlots">,
                  slotDate: values.date,
                })
              }}
              onDelete={async (slotId) => {
                await deleteSlot({
                  cohortId,
                  slotId: slotId as Id<"lightningTalkSlots">,
                })
              }}
              deleteDescription="Remove or reassign enrolled talks before deleting this slot."
            />

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Assign talk"
                  description="Register a fellow for a slot on their behalf."
                />
              </CardHeader>
              <CardContent>
                <form
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
                        error instanceof Error
                          ? error.message
                          : "Assignment failed.",
                      )
                    }
                  }}
                >
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="assign-fellow">Fellow</FieldLabel>
                      <Select
                        value={assignFellowId}
                        onValueChange={(value) =>
                          value && setAssignFellowId(value)
                        }
                      >
                        <SelectTrigger id="assign-fellow">
                          <SelectValue placeholder="Select fellow…">
                            {assignFellowName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {unregisteredFellows.map((fellow) => (
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
                        onValueChange={(value) =>
                          value && setSelectedSlot(value)
                        }
                      >
                        <SelectTrigger id="assign-slot">
                          <SelectValue placeholder="Select slot…">
                            {selectedSlotEntry
                              ? formatDate(selectedSlotEntry.slotDate)
                              : null}
                          </SelectValue>
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
              </CardContent>
            </Card>
          </>
        ) : null}

        {!isLeader && cohort?.fellow && !myTalk ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title="Enroll in a talk"
                description="Pick a slot and share your topic."
              />
            </CardHeader>
            <CardContent>
              <form
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
                      error instanceof Error
                        ? error.message
                        : "Enrollment failed.",
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
                        <SelectValue placeholder="Select date…">
                          {selectedSlotEntry
                            ? formatDate(selectedSlotEntry.slotDate)
                            : null}
                        </SelectValue>
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
            </CardContent>
          </Card>
        ) : null}

        <section className="flex flex-col gap-4">
          <SectionHeader
            title="Registered talks"
            description={
              isLeader
                ? "Only fellows who have enrolled or been assigned appear here."
                : "Your pod's scheduled lightning talks."
            }
          />

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
                          settingsProgramCode ??
                            cohort?.cohort.programCode ??
                            "",
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
          ) : registeredTalks.length === 0 ? (
            <EmptyState
              title="No lightning talks yet"
              description={
                isLeader
                  ? "Assign talks to fellows or wait for them to enroll once you've added slots."
                  : "Enroll in a slot above when your pod leader adds talk dates."
              }
            />
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
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
                  {registeredTalks.map(({ talk, fellow, slot }) => {
                    const editable = isLeader || myFellowId === fellow._id

                    return (
                      <TableRow key={talk._id}>
                        <TableCell className="font-medium">
                          {fellow.name}
                        </TableCell>
                        <TableCell>
                          {slot ? formatDate(slot.slotDate) : "—"}
                        </TableCell>
                        <TableCell>{talk.topic}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={talk.completed}
                            disabled={!editable}
                            aria-label={`Completed lightning talk for ${fellow.name}`}
                            onCheckedChange={(checked) => {
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
        </section>
      </PageBody>
    </>
  )
}
