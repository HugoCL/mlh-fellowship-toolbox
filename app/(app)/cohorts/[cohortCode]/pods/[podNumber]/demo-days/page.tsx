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
  const updateDemoCompletion = useMutation(api.demoDays.updateDemoCompletion)

  const [selectedFellow, setSelectedFellow] = useState<string>("")
  const [demoDate, setDemoDate] = useState("")

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
        <Alert>
          <AlertDescription>
            For your demo day, share what you achieved in your portfolio and the
            learnings from the current week.
          </AlertDescription>
        </Alert>

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
                    demoDate: new Date(demoDate).getTime(),
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
                <FieldLabel htmlFor="demo-date">Demo date</FieldLabel>
                <Input
                  id="demo-date"
                  type="date"
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                />
              </Field>
              <Button type="submit">Assign Date</Button>
            </form>
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
