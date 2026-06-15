"use client"

import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Info } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { getStatusLabel, type OneOnOneStatus, StatusBadge } from "@/lib/status"
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
  const isImpersonating = cohort?.impersonation != null
  const showLeaderView = cohort
    ? !isImpersonating && (cohort.canManagePod || cohort.isUmbrellaViewer)
    : false
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

  if (!showLeaderView) {
    return (
      <FellowOneOnOnesView
        myFellowId={myFellowId}
        fellows={fellows}
        pairs={peerData.pairs}
        instances={leaderData.instances}
        records={leaderData.records}
        podLeaderSchedulingLink={leaderData.podLeaderSchedulingLink}
        setPeerStatus={setPeerStatus}
        setLeaderStatus={setLeaderStatus}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="1:1 Tracker"
        description="Track peer 1:1s and pod leader check-ins for this cohort."
      />
      <PageBody>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Mark <span className="font-medium text-foreground">Completed</span>{" "}
            once you've had a 1:1 with your podmate. You can update 1:1s you're
            part of.
          </span>
        </p>

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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Peer 1:1 matrix</CardTitle>
                <CardDescription>
                  Each pair shares one status. Find your pairs in your row;
                  editable cells show a dropdown.
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
                        {fellows.map((columnFellow) => (
                          <TableHead
                            key={columnFellow._id}
                            className="min-w-28 text-center"
                          >
                            {columnFellow.name.split(" ")[0]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fellows.map((rowFellow) => (
                        <TableRow key={rowFellow._id} className="group">
                          <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/50">
                            {rowFellow.name}
                          </TableCell>
                          {fellows.map((columnFellow) => {
                            if (rowFellow._id === columnFellow._id) {
                              return (
                                <TableCell
                                  key={columnFellow._id}
                                  className="bg-muted/30 text-center text-muted-foreground/50"
                                >
                                  —
                                </TableCell>
                              )
                            }

                            const pair = peerData?.pairs.find(
                              (item) =>
                                (item.fellowAId === rowFellow._id &&
                                  item.fellowBId === columnFellow._id) ||
                                (item.fellowAId === columnFellow._id &&
                                  item.fellowBId === rowFellow._id),
                            )

                            const isCanonicalCell =
                              rowFellow._id < columnFellow._id
                            const showPeerCell =
                              pair &&
                              (isCanonicalCell || myFellowId === rowFellow._id)

                            if (!showPeerCell) {
                              return (
                                <TableCell
                                  key={columnFellow._id}
                                  className="bg-muted/10"
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
                                    onValueChange={(value) => {
                                      if (!value) return
                                      void setPeerStatus(
                                        pair.fellowAId,
                                        pair.fellowBId,
                                        value,
                                      )
                                    }}
                                  >
                                    <SelectTrigger
                                      size="sm"
                                      className="mx-auto w-28"
                                      aria-label={`Status for ${rowFellow.name} and ${columnFellow.name}`}
                                    >
                                      <SelectValue>
                                        {getStatusLabel(pair.status)}
                                      </SelectValue>
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
                                  <div className="flex justify-center">
                                    <StatusBadge status={pair.status} />
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pod leader 1:1s</CardTitle>
                <CardDescription>
                  Check-ins between each fellow and their pod leader.
                </CardDescription>
                {isLeader ? (
                  <CardAction>
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault()
                        try {
                          await createInstance({
                            cohortId,
                            title: instanceTitle,
                          })
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
                          className="w-48"
                          value={instanceTitle}
                          onChange={(e) => setInstanceTitle(e.target.value)}
                          placeholder="Mid-program check-in…"
                        />
                      </Field>
                      <Button type="submit">Add Round</Button>
                    </form>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent className="px-0">
                {(leaderData?.instances ?? []).length === 0 ? (
                  <p className="border-t border-border/60 px-(--card-spacing) pt-(--card-spacing) text-sm text-muted-foreground">
                    {isLeader
                      ? "No leader rounds yet. Add one above to start tracking."
                      : "No leader rounds yet. Your pod leader hasn't added any."}
                  </p>
                ) : (
                  <div className="overflow-auto border-t border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="sticky left-0 z-20 bg-card">
                            Fellow
                          </TableHead>
                          {(leaderData?.instances ?? []).map((instance) => (
                            <TableHead key={instance._id} className="min-w-40">
                              {instance.title}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(leaderData?.fellows ?? []).map((fellow) => (
                          <TableRow key={fellow._id} className="group">
                            <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/50">
                              {fellow.name}
                            </TableCell>
                            {(leaderData?.instances ?? []).map((instance) => {
                              const record = leaderData?.records.find(
                                (item) =>
                                  item.fellowId === fellow._id &&
                                  item.instanceId === instance._id,
                              )
                              const status = record?.status ?? "notStarted"
                              const editable =
                                isLeader || myFellowId === fellow._id

                              return (
                                <TableCell key={instance._id}>
                                  {editable ? (
                                    <Select
                                      value={status}
                                      onValueChange={(value) => {
                                        if (!value) return
                                        void setLeaderStatus(
                                          fellow._id,
                                          instance._id,
                                          value,
                                        )
                                      }}
                                    >
                                      <SelectTrigger
                                        size="sm"
                                        className="w-32"
                                        aria-label={`${fellow.name} ${instance.title}`}
                                      >
                                        <SelectValue>
                                          {getStatusLabel(status)}
                                        </SelectValue>
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scheduling links</CardTitle>
                <CardDescription>
                  Scheduling links fellows shared for booking 1:1s.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {fellows.map((fellow) => (
                    <div
                      key={fellow._id}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
                    >
                      <span className="truncate text-sm font-medium">
                        {fellow.name}
                      </span>
                      {fellow.calendlyUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={
                            <Link
                              href={fellow.calendlyUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open scheduling link for ${fellow.name}`}
                            />
                          }
                        >
                          Open scheduling link
                          <ExternalLink aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          No link yet
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}

type FellowSummary = {
  _id: Id<"fellows">
  name: string
  calendlyUrl?: string
}

type PeerPair = {
  _id: Id<"peerOneOnOnes">
  fellowAId: Id<"fellows">
  fellowBId: Id<"fellows">
  status: OneOnOneStatus
}

type LeaderInstance = {
  _id: Id<"oneOnOneInstances">
  title: string
}

type LeaderRecord = {
  _id: Id<"leaderOneOnOnes">
  fellowId: Id<"fellows">
  instanceId: Id<"oneOnOneInstances">
  status: OneOnOneStatus
}

const STATUS_RANK: Record<OneOnOneStatus, number> = {
  notStarted: 0,
  scheduled: 1,
  completed: 2,
}

function StatusSelect({
  value,
  ariaLabel,
  onChange,
}: {
  value: OneOnOneStatus
  ariaLabel: string
  onChange: (status: OneOnOneStatus) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return
        onChange(next as OneOnOneStatus)
      }}
    >
      <SelectTrigger size="sm" className="w-32" aria-label={ariaLabel}>
        <SelectValue>{getStatusLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="notStarted">Not yet</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function FellowOneOnOnesView({
  myFellowId,
  fellows,
  pairs,
  instances,
  records,
  podLeaderSchedulingLink,
  setPeerStatus,
  setLeaderStatus,
}: {
  myFellowId: Id<"fellows"> | undefined
  fellows: FellowSummary[]
  pairs: PeerPair[]
  instances: LeaderInstance[]
  records: LeaderRecord[]
  podLeaderSchedulingLink: string | null
  setPeerStatus: (
    fellowAId: Id<"fellows">,
    fellowBId: Id<"fellows">,
    status: OneOnOneStatus,
  ) => void
  setLeaderStatus: (
    fellowId: Id<"fellows">,
    instanceId: Id<"oneOnOneInstances">,
    status: OneOnOneStatus,
  ) => void
}) {
  const fellowMap = new Map(fellows.map((fellow) => [fellow._id, fellow]))

  const myPeerItems = myFellowId
    ? pairs
        .filter(
          (pair) =>
            pair.fellowAId === myFellowId || pair.fellowBId === myFellowId,
        )
        .map((pair) => {
          const otherId =
            pair.fellowAId === myFellowId ? pair.fellowBId : pair.fellowAId
          return { pair, other: fellowMap.get(otherId) }
        })
        .filter(
          (item): item is { pair: PeerPair; other: FellowSummary } =>
            item.other != null,
        )
        .sort((a, b) => {
          const rank = STATUS_RANK[a.pair.status] - STATUS_RANK[b.pair.status]
          if (rank !== 0) return rank
          return a.other.name.localeCompare(b.other.name)
        })
    : []

  const pendingPeerItems = myPeerItems.filter(
    (item) => item.pair.status !== "completed",
  )
  const completedPeerItems = myPeerItems.filter(
    (item) => item.pair.status === "completed",
  )

  const myLeaderItems = myFellowId
    ? instances.map((instance) => {
        const record = records.find(
          (item) =>
            item.fellowId === myFellowId && item.instanceId === instance._id,
        )
        return {
          instance,
          status: record?.status ?? ("notStarted" as OneOnOneStatus),
        }
      })
    : []

  const pendingLeaderItems = myLeaderItems.filter(
    (item) => item.status !== "completed",
  )
  const completedLeaderItems = myLeaderItems.filter(
    (item) => item.status === "completed",
  )

  const hasNothing = myPeerItems.length === 0 && myLeaderItems.length === 0

  function renderPeerRow(item: { pair: PeerPair; other: FellowSummary }) {
    const { pair, other } = item
    return (
      <div
        key={pair._id}
        className="flex flex-col gap-3 px-(--card-spacing) py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={pair.status} />
          <span className="font-medium">{other.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {other.calendlyUrl ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={other.calendlyUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Schedule with ${other.name}`}
                />
              }
            >
              Schedule
              <ExternalLink aria-hidden="true" />
            </Button>
          ) : null}
          <StatusSelect
            value={pair.status}
            ariaLabel={`Status for your 1:1 with ${other.name}`}
            onChange={(status) =>
              setPeerStatus(pair.fellowAId, pair.fellowBId, status)
            }
          />
        </div>
      </div>
    )
  }

  function renderLeaderRow(item: {
    instance: LeaderInstance
    status: OneOnOneStatus
  }) {
    const { instance, status } = item
    return (
      <div
        key={instance._id}
        className="flex flex-col gap-3 px-(--card-spacing) py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="font-medium">{instance.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {podLeaderSchedulingLink ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={podLeaderSchedulingLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Schedule ${instance.title} with your pod leader`}
                />
              }
            >
              Schedule
              <ExternalLink aria-hidden="true" />
            </Button>
          ) : null}
          {myFellowId ? (
            <StatusSelect
              value={status}
              ariaLabel={`Status for ${instance.title}`}
              onChange={(next) => setLeaderStatus(myFellowId, instance._id, next)}
            />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="1:1 Tracker"
        description="Your pending peer and pod leader 1:1s."
      />
      <PageBody>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Schedule each 1:1, then mark it{" "}
            <span className="font-medium text-foreground">Completed</span> once
            you've met.
          </span>
        </p>

        {hasNothing ? (
          <EmptyState
            title="Nothing to track yet"
            description="Your pod leader hasn't set up peer or pod leader 1:1s for you yet. Check back once they're added."
          />
        ) : (
          <>
            {myPeerItems.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">My peer 1:1s</CardTitle>
                  <CardDescription>
                    {pendingPeerItems.length > 0
                      ? `${pendingPeerItems.length} pending — schedule, then mark completed.`
                      : "All caught up. You can still update past 1:1s below."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {pendingPeerItems.length > 0 ? (
                    <div className="divide-y divide-border/60 border-t border-border/60">
                      {pendingPeerItems.map(renderPeerRow)}
                    </div>
                  ) : null}
                  {completedPeerItems.length > 0 ? (
                    <>
                      <p className="border-t border-border/60 px-(--card-spacing) pt-(--card-spacing) pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Completed
                      </p>
                      <div className="divide-y divide-border/60 border-t border-border/60">
                        {completedPeerItems.map(renderPeerRow)}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {myLeaderItems.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    My pod leader 1:1s
                  </CardTitle>
                  <CardDescription>
                    {pendingLeaderItems.length > 0
                      ? `${pendingLeaderItems.length} pending check-in${
                          pendingLeaderItems.length === 1 ? "" : "s"
                        } with your pod leader.`
                      : "All caught up with your pod leader check-ins."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {pendingLeaderItems.length > 0 ? (
                    <div className="divide-y divide-border/60 border-t border-border/60">
                      {pendingLeaderItems.map(renderLeaderRow)}
                    </div>
                  ) : null}
                  {completedLeaderItems.length > 0 ? (
                    <>
                      <p className="border-t border-border/60 px-(--card-spacing) pt-(--card-spacing) pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Completed
                      </p>
                      <div className="divide-y divide-border/60 border-t border-border/60">
                        {completedLeaderItems.map(renderLeaderRow)}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </PageBody>
    </>
  )
}
