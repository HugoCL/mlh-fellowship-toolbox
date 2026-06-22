"use client"

import { useMutation, useQuery } from "convex/react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import { runGenerateAllWeeks } from "@/components/app/manageable-week-slot-list"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
import { PageSkeleton, SkeletonTable } from "@/components/app/page-skeleton"
import { SectionHeader } from "@/components/app/section-header"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
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
  toDateInputValue,
} from "@/lib/dates"
import type { Weekday } from "@/lib/programWeeks"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { getWeekdayLabel, WEEKDAY_OPTIONS } from "@/lib/weekdays"

export default function DemoDaysPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const data = useQuery(
    api.demoDays.listDemoDays,
    cohortId ? { cohortId } : "skip",
  )
  const assignDemoDay = useMutation(api.demoDays.assignDemoDay)
  const generateAllDemoDays = useMutation(api.demoDays.generateAllDemoDays)
  const removeDemoDay = useMutation(api.demoDays.removeDemoDay)
  const updateDemoCompletion = useMutation(api.demoDays.updateDemoCompletion)

  const [selectedFellow, setSelectedFellow] = useState<string>("")
  const [demoDate, setDemoDate] = useState("")
  const [editingDemoDayId, setEditingDemoDayId] =
    useState<Id<"demoDays"> | null>(null)
  const [editDemoDate, setEditDemoDate] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateDayOfWeek, setGenerateDayOfWeek] = useState<Weekday>(5)
  const [generateStartDate, setGenerateStartDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const isLeader = cohort?.canManagePod ?? false
  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer
  const myFellowId = cohort?.fellow?._id
  const demoMap = new Map(
    (data?.demoDays ?? []).map((demo) => [demo.fellowId, demo]),
  )

  if (isLoading || data === undefined) {
    return (
      <PageSkeleton
        title="Demo Days"
        description="Assign presentation dates and track demo completion."
        width={isLeader ? "wide" : "default"}
      >
        <SkeletonTable rows={5} columns={isLeader ? 4 : 3} />
      </PageSkeleton>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="Demo Days"
          description="Assign presentation dates and track demo completion."
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
          title="Demo Days"
          description="Assign presentation dates and track demo completion."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  if (!isLeader) {
    return (
      <FellowDemoDayView
        cohortId={cohortId}
        myFellowId={myFellowId}
        fellows={data?.fellows ?? []}
        demoMap={demoMap}
        updateDemoCompletion={updateDemoCompletion}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Demo Days"
        description="Assign presentation dates and track demo completion."
      />
      <PageBody width="wide">
        <InfoCallout variant="info">
          Assign demo dates for fellows. Fellows can mark their own completed
          status.
        </InfoCallout>

        {(data?.fellows ?? []).length > 0 ? (
          <PageToolbar title="Assign a demo date">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!selectedFellow || !demoDate) {
                  toast.error("Select a fellow and date.")
                  return
                }
                try {
                  await assignDemoDay({
                    cohortId,
                    fellowId: selectedFellow as Id<"fellows">,
                    demoDate: parseProgramDate(demoDate),
                  })
                  toast.success("Demo day assigned.")
                  setDemoDate("")
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to assign demo day.",
                  )
                }
              }}
            >
              <Field>
                <FieldLabel htmlFor="demo-fellow">Fellow</FieldLabel>
                <Select
                  value={selectedFellow}
                  onValueChange={(value) => value && setSelectedFellow(value)}
                >
                  <SelectTrigger id="demo-fellow">
                    <SelectValue placeholder="Select fellow…">
                      {
                        (data?.fellows ?? []).find(
                          (fellow) => fellow._id === selectedFellow,
                        )?.name
                      }
                    </SelectValue>
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
                <FieldLabel htmlFor="demo-date">
                  Demo date ({PROGRAM_TIMEZONE_LABEL})
                </FieldLabel>
                <Input
                  id="demo-date"
                  type="date"
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                />
              </Field>
              <Button type="submit">Assign Date</Button>
            </form>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateDayOfWeek(getProgramWeekday(cohort.cohort.startDate))
                setGenerateStartDate(toDateInputValue(cohort.cohort.startDate))
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
                  <DialogTitle>Generate demo days</DialogTitle>
                  <DialogDescription>
                    Assign one demo date per program week on the selected day,
                    starting from the chosen date. Extra fellows share dates
                    when there are more fellows than weeks.
                  </DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel htmlFor="generate-demo-day-of-week">
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
                      id="generate-demo-day-of-week"
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
                <Field>
                  <FieldLabel htmlFor="generate-demo-start-date">
                    Start from ({PROGRAM_TIMEZONE_LABEL})
                  </FieldLabel>
                  <Input
                    id="generate-demo-start-date"
                    type="date"
                    value={generateStartDate}
                    onChange={(event) =>
                      setGenerateStartDate(event.target.value)
                    }
                  />
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
                    disabled={isGenerating || !generateStartDate}
                    onClick={() => {
                      setIsGenerating(true)
                      void runGenerateAllWeeks(
                        () =>
                          generateAllDemoDays({
                            cohortId,
                            dayOfWeek: generateDayOfWeek,
                            startFromDate: parseProgramDate(generateStartDate),
                          }),
                        "demo day",
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
        ) : null}

        {(data?.fellows ?? []).length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description="Add fellows in Cohort Settings before assigning demo days."
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
            <CardContent className="flex flex-col gap-4 px-0 pt-6">
              <div className="px-6">
                <SectionHeader
                  title="Demo day schedule"
                  description="One presentation date per fellow. Edit or remove assignments as needed."
                />
              </div>
              <div className="overflow-auto border-t border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fellow</TableHead>
                      <TableHead>Date for Demo</TableHead>
                      <TableHead>Completed Demo</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.fellows ?? []).map((fellow) => {
                      const demo = demoMap.get(fellow._id)

                      return (
                        <TableRow key={fellow._id}>
                          <TableCell className="font-medium">
                            {fellow.name}
                          </TableCell>
                          <TableCell>
                            {demo ? formatDate(demo.demoDate) : "Not assigned"}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={demo?.completed ?? false}
                              disabled={!demo}
                              aria-label={`Completed demo for ${fellow.name}`}
                              onCheckedChange={(checked) => {
                                if (!demo) return
                                void updateDemoCompletion({
                                  cohortId,
                                  demoDayId: demo._id,
                                  completed: checked === true,
                                }).then(
                                  () => toast.success("Demo status updated."),
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
                          <TableCell className="text-right">
                            {demo ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Edit demo date for ${fellow.name}`}
                                  onClick={() => {
                                    setEditingDemoDayId(demo._id)
                                    setEditDemoDate(
                                      toDateInputValue(demo.demoDate),
                                    )
                                  }}
                                >
                                  <PencilIcon className="size-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Remove demo date for ${fellow.name}`}
                                      />
                                    }
                                  >
                                    <Trash2Icon className="size-4 text-destructive" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remove demo day?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This clears the assigned date for{" "}
                                        {fellow.name}. You can assign a new date
                                        later.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          void removeDemoDay({
                                            cohortId,
                                            demoDayId: demo._id,
                                          }).then(
                                            () =>
                                              toast.success(
                                                "Demo day removed.",
                                              ),
                                            (error: unknown) =>
                                              toast.error(
                                                error instanceof Error
                                                  ? error.message
                                                  : "Remove failed.",
                                              ),
                                          )
                                        }
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={editingDemoDayId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingDemoDayId(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit demo date</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="edit-demo-date">
                Demo date ({PROGRAM_TIMEZONE_LABEL})
              </FieldLabel>
              <Input
                id="edit-demo-date"
                type="date"
                value={editDemoDate}
                onChange={(event) => setEditDemoDate(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingDemoDayId(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                disabled={isSavingEdit || !editDemoDate || !editingDemoDayId}
                onClick={() => {
                  const demo = (data?.demoDays ?? []).find(
                    (item) => item._id === editingDemoDayId,
                  )
                  if (!demo || !editDemoDate) {
                    return
                  }
                  setIsSavingEdit(true)
                  void assignDemoDay({
                    cohortId,
                    fellowId: demo.fellowId,
                    demoDate: parseProgramDate(editDemoDate),
                  })
                    .then(() => {
                      toast.success("Demo date updated.")
                      setEditingDemoDayId(null)
                    })
                    .catch((error: unknown) =>
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Update failed.",
                      ),
                    )
                    .finally(() => setIsSavingEdit(false))
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  )
}

type DemoDayRecord = {
  _id: Id<"demoDays">
  fellowId: Id<"fellows">
  demoDate: number
  completed: boolean
}

function FellowDemoDayView({
  cohortId,
  myFellowId,
  fellows,
  demoMap,
  updateDemoCompletion,
}: {
  cohortId: Id<"cohorts">
  myFellowId: Id<"fellows"> | undefined
  fellows: Array<{ _id: Id<"fellows">; name: string }>
  demoMap: Map<Id<"fellows">, DemoDayRecord>
  updateDemoCompletion: (args: {
    cohortId: Id<"cohorts">
    demoDayId: Id<"demoDays">
    completed: boolean
  }) => Promise<unknown>
}) {
  const myFellow = fellows.find((fellow) => fellow._id === myFellowId)
  const myDemo = myFellowId ? demoMap.get(myFellowId) : undefined

  return (
    <>
      <PageHeader
        title="Demo Days"
        description="Your presentation date and demo completion status."
      />
      <PageBody>
        <InfoCallout variant="info">
          For your demo day, share what you achieved in your portfolio and the
          learnings from the current week.
        </InfoCallout>

        {fellows.length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description="Your pod leader hasn't added fellows to this cohort yet."
          />
        ) : (
          <>
            {myFellow && !myDemo ? (
              <EmptyState
                title="No demo day scheduled"
                description="Your pod leader hasn't assigned a demo date for you yet."
              />
            ) : null}
            {myFellow && myDemo ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <SectionHeader
                    title="Your demo day"
                    description="Mark completed after you present."
                  />
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{myFellow.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(myDemo.demoDate)} ({PROGRAM_TIMEZONE_LABEL})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={myDemo.completed}
                        aria-label="Completed demo"
                        onCheckedChange={(checked) => {
                          void updateDemoCompletion({
                            cohortId,
                            demoDayId: myDemo._id,
                            completed: checked === true,
                          }).then(
                            () => toast.success("Demo status updated."),
                            (error: unknown) =>
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Update failed.",
                              ),
                          )
                        }}
                      />
                      Completed demo
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardContent className="flex flex-col gap-4 px-0 pt-6">
                <div className="px-6">
                  <SectionHeader
                    title="Demo day schedule"
                    description="Presentation dates and completion status for your pod."
                  />
                </div>
                <div className="overflow-auto border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fellow</TableHead>
                        <TableHead>Date for Demo</TableHead>
                        <TableHead>Completed Demo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fellows.map((fellow) => {
                        const demo = demoMap.get(fellow._id)
                        const editable = myFellowId === fellow._id

                        return (
                          <TableRow key={fellow._id}>
                            <TableCell className="font-medium">
                              {fellow.name}
                            </TableCell>
                            <TableCell>
                              {demo
                                ? formatDate(demo.demoDate)
                                : "Not assigned"}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={demo?.completed ?? false}
                                disabled={!editable || !demo}
                                aria-label={`Completed demo for ${fellow.name}`}
                                onCheckedChange={(checked) => {
                                  if (!demo) return
                                  void updateDemoCompletion({
                                    cohortId,
                                    demoDayId: demo._id,
                                    completed: checked === true,
                                  }).then(
                                    () => toast.success("Demo status updated."),
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
              </CardContent>
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}
