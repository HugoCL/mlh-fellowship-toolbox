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
import { type OneOnOneStatus, StatusBadge } from "@/lib/status"
import { useCohortRoute } from "@/lib/use-cohort-route"

export default function OneOnOnesPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const peerData = useQuery(
    api.oneOnOnes.listPeerOneOnOnes,
    cohortId ? { cohortId } : "skip",
  )
  const leaderData = useQuery(
    api.oneOnOnes.listLeaderOneOnOnes,
    cohortId ? { cohortId } : "skip",
  )
  const updatePeerStatus = useMutation(api.oneOnOnes.updatePeerStatus)
  const updateLeaderStatus = useMutation(api.oneOnOnes.updateLeaderStatus)
  const createInstance = useMutation(api.oneOnOnes.createInstance)
  const [instanceTitle, setInstanceTitle] = useState("")

  const fellows = peerData?.fellows ?? []
  const isLeader = cohort?.canManagePod ?? false
  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer
  const myFellowId = cohort?.fellow?._id

  function canEditPair(fellowAId: Id<"fellows">, fellowBId: Id<"fellows">) {
    if (isLeader) return true
    if (!myFellowId) return false
    return myFellowId === fellowAId || myFellowId === fellowBId
  }

  async function setPeerStatus(
    fellowAId: Id<"fellows">,
    fellowBId: Id<"fellows">,
    status: OneOnOneStatus,
  ) {
    if (!cohortId) return
    try {
      await updatePeerStatus({ cohortId, fellowAId, fellowBId, status })
      toast.success("Peer 1:1 updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  async function setLeaderStatus(
    fellowId: Id<"fellows">,
    instanceId: Id<"oneOnOneInstances">,
    status: OneOnOneStatus,
  ) {
    if (!cohortId) return
    try {
      await updateLeaderStatus({ cohortId, fellowId, instanceId, status })
      toast.success("Pod leader 1:1 updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    }
  }

  if (isLoading || peerData === undefined || leaderData === undefined) {
    return (
      <>
        <PageHeader
          title="1:1 Tracker"
          description="Track peer 1:1s and pod leader check-ins for this cohort."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching 1:1 data for this pod."
          />
        </PageBody>
      </>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="1:1 Tracker"
          description="Track peer 1:1s and pod leader check-ins for this cohort."
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
          title="1:1 Tracker"
          description="Track peer 1:1s and pod leader check-ins for this cohort."
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
        title="1:1 Tracker"
        description="Track peer 1:1s and pod leader check-ins for this cohort."
      />
      <PageBody>
        <Alert>
          <AlertDescription>
            Select completed when you had a 1:1 with your podmate. Fellows can
            only update their own rows.
          </AlertDescription>
        </Alert>

        {isLeader ? (
          <PageToolbar title="Add a pod leader 1:1 round">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (event) => {
                event.preventDefault()
                try {
                  await createInstance({ cohortId, title: instanceTitle })
                  toast.success("Leader 1:1 round created.")
                  setInstanceTitle("")
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to create round.",
                  )
                }
              }}
            >
              <Field>
                <FieldLabel htmlFor="instance-title">
                  New leader round
                </FieldLabel>
                <Input
                  id="instance-title"
                  value={instanceTitle}
                  onChange={(e) => setInstanceTitle(e.target.value)}
                  placeholder="Mid-program check-in…"
                />
              </Field>
              <Button type="submit">Add Round</Button>
            </form>
          </PageToolbar>
        ) : null}

        {fellows.length === 0 ? (
          <EmptyState
            title="No fellows yet"
            description={
              isLeader
                ? "Add fellows in Cohort Settings to start tracking 1:1s."
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
          <>
            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-lg font-semibold">
                Peer 1:1 matrix
              </h2>
              <div className="overflow-auto rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">
                        Fellow
                      </TableHead>
                      {fellows.map((columnFellow) => (
                        <TableHead
                          key={columnFellow._id}
                          className="min-w-32 text-center"
                        >
                          {columnFellow.name.split(" ")[0]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fellows.map((rowFellow) => (
                      <TableRow key={rowFellow._id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {rowFellow.name}
                        </TableCell>
                        {fellows.map((columnFellow) => {
                          if (rowFellow._id === columnFellow._id) {
                            return (
                              <TableCell
                                key={columnFellow._id}
                                className="bg-muted/40"
                              />
                            )
                          }

                          const pair = peerData?.pairs.find(
                            (item) =>
                              (item.fellowAId === rowFellow._id &&
                                item.fellowBId === columnFellow._id) ||
                              (item.fellowAId === columnFellow._id &&
                                item.fellowBId === rowFellow._id),
                          )

                          if (!pair || rowFellow._id > columnFellow._id) {
                            return (
                              <TableCell
                                key={columnFellow._id}
                                className="bg-muted/20"
                              />
                            )
                          }

                          const editable = canEditPair(
                            pair.fellowAId,
                            pair.fellowBId,
                          )

                          return (
                            <TableCell
                              key={columnFellow._id}
                              className="text-center"
                            >
                              {editable ? (
                                <Select
                                  value={pair.status}
                                  onValueChange={(value) =>
                                    void setPeerStatus(
                                      pair.fellowAId,
                                      pair.fellowBId,
                                      value as OneOnOneStatus,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    className="mx-auto w-36"
                                    aria-label={`Status for ${rowFellow.name} and ${columnFellow.name}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="notStarted">
                                        Not yet
                                      </SelectItem>
                                      <SelectItem value="scheduled">
                                        Scheduled
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Completed
                                      </SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <StatusBadge status={pair.status} />
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-lg font-semibold">
                Pod leader 1:1s
              </h2>
              <div className="overflow-auto rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fellow</TableHead>
                      {(leaderData?.instances ?? []).map((instance) => (
                        <TableHead key={instance._id}>
                          {instance.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leaderData?.fellows ?? []).map((fellow) => (
                      <TableRow key={fellow._id}>
                        <TableCell className="font-medium">
                          {fellow.name}
                        </TableCell>
                        {(leaderData?.instances ?? []).map((instance) => {
                          const record = leaderData?.records.find(
                            (item) =>
                              item.fellowId === fellow._id &&
                              item.instanceId === instance._id,
                          )
                          const status = record?.status ?? "notStarted"
                          const editable = isLeader || myFellowId === fellow._id

                          return (
                            <TableCell key={instance._id}>
                              {editable ? (
                                <Select
                                  value={status}
                                  onValueChange={(value) =>
                                    void setLeaderStatus(
                                      fellow._id,
                                      instance._id,
                                      value as OneOnOneStatus,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    className="w-36"
                                    aria-label={`${fellow.name} ${instance.title}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="notStarted">
                                        Not yet
                                      </SelectItem>
                                      <SelectItem value="scheduled">
                                        Scheduled
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Completed
                                      </SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <StatusBadge status={status} />
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-lg border border-border/70 p-4">
              <h3 className="font-medium">Scheduling links</h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {fellows.map((fellow) => (
                  <li
                    key={fellow._id}
                    className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>{fellow.name}</span>
                    {fellow.calendlyUrl ? (
                      <a
                        href={fellow.calendlyUrl}
                        className="truncate text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {fellow.calendlyUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No link yet</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </PageBody>
    </>
  )
}
