"use client"

import { useMutation, useQuery } from "convex/react"
import { Info, PencilIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { runGenerateAllWeeks } from "@/components/app/manageable-week-slot-list"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
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
  PROGRAM_TIMEZONE_LABEL,
  parseProgramDate,
  toDateInputValue,
} from "@/lib/dates"
import { useCohortRoute } from "@/lib/use-cohort-route"

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
      <>
        <PageHeader
          title="Demo Days"
          description="Assign presentation dates and track demo completion."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching demo day assignments for this pod."
          />
        </PageBody>
      </>
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

  return (
    <>
      <PageHeader
        title="Demo Days"
        description="Assign presentation dates and track demo completion."
      />
      <PageBody>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {isLeader
              ? "Assign demo dates for fellows. Fellows can mark their own completed status."
              : "For your demo day, share what you achieved in your portfolio and the learnings from the current week."}
          </span>
        </p>

        {isLeader && (data?.fellows ?? []).length > 0 ? (
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
                      {(data?.fellows ?? []).find(
                        (fellow) => fellow._id === selectedFellow,
                      )?.name}
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
              onClick={() =>
                void runGenerateAllWeeks(
                  () => generateAllDemoDays({ cohortId }),
                  "demo day",
                )
              }
            >
              Generate All Weeks
            </Button>
          </PageToolbar>
        ) : null}

        {(data?.fellows ?? []).length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description={
              isLeader
                ? "Add fellows in Cohort Settings before assigning demo days."
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
                  <TableHead>Date for Demo</TableHead>
                  <TableHead>Completed Demo</TableHead>
                  {isLeader ? (
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.fellows ?? []).map((fellow) => {
                  const demo = demoMap.get(fellow._id)
                  const editable = isLeader || myFellowId === fellow._id

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
                      {isLeader ? (
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
                                            toast.success("Demo day removed."),
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
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
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
