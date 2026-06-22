"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import type { Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"
import { getStatusLabel, type OneOnOneStatus, StatusBadge } from "@/lib/status"
import type {
  FellowSummary,
  LeaderInstance,
  LeaderRecord,
  PeerPair,
} from "./types"

export function LeaderOneOnOnesView({
  cohortId,
  settingsProgramCode,
  programCode,
  fellows,
  leaderFellows,
  pairs,
  instances,
  records,
  isLeader,
  myFellowId,
  canEditPair,
  setPeerStatus,
  setLeaderStatus,
  createInstance,
  generatePeerPairs,
  generateLeaderRecords,
}: {
  cohortId: Id<"cohorts">
  settingsProgramCode: string
  programCode: string
  fellows: FellowSummary[]
  leaderFellows: FellowSummary[]
  pairs: PeerPair[]
  instances: LeaderInstance[]
  records: LeaderRecord[]
  isLeader: boolean
  myFellowId: Id<"fellows"> | undefined
  canEditPair: (fellowAId: Id<"fellows">, fellowBId: Id<"fellows">) => boolean
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
  createInstance: (args: {
    cohortId: Id<"cohorts">
    title: string
  }) => Promise<unknown>
  generatePeerPairs: (args: { cohortId: Id<"cohorts"> }) => Promise<number>
  generateLeaderRecords: (args: { cohortId: Id<"cohorts"> }) => Promise<number>
}) {
  const [instanceTitle, setInstanceTitle] = useState("")

  return (
    <>
      <PageHeader
        title="1:1 Tracker"
        description="Track peer 1:1s and pod leader check-ins for this cohort."
      />
      <PageBody width="wide">
        <InfoCallout variant="info">
          Mark <span className="font-medium text-foreground">Completed</span>{" "}
          once you&apos;ve had a 1:1 with your podmate. You can update 1:1s
          you&apos;re part of.
        </InfoCallout>

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
                        settingsProgramCode || programCode,
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
                <SectionHeader
                  title="Peer 1:1 matrix"
                  description="Each pair shares one status. Find your pairs in your row; editable cells show a dropdown."
                  actions={
                    isLeader ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const created = await generatePeerPairs({
                              cohortId,
                            })
                            toast.success(
                              `Generated ${created} peer 1:1 pairs.`,
                            )
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Failed to generate peer pairs.",
                            )
                          }
                        }}
                      >
                        Generate Peer Pairs
                      </Button>
                    ) : null
                  }
                />
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-auto border-t border-border">
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
                      {fellows.map((rowFellow, rowIndex) => (
                        <TableRow key={rowFellow._id} className="group">
                          <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/50">
                            {rowFellow.name}
                          </TableCell>
                          {fellows.map((columnFellow, columnIndex) => {
                            if (rowIndex === columnIndex) {
                              return (
                                <TableCell
                                  key={columnFellow._id}
                                  className="bg-muted/30 text-center text-muted-foreground/50"
                                >
                                  —
                                </TableCell>
                              )
                            }

                            const pair = pairs.find(
                              (item) =>
                                (item.fellowAId === rowFellow._id &&
                                  item.fellowBId === columnFellow._id) ||
                                (item.fellowAId === columnFellow._id &&
                                  item.fellowBId === rowFellow._id),
                            )

                            const showPeerCell = pair && rowIndex < columnIndex

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
                <SectionHeader
                  title="Pod leader 1:1s"
                  description="Check-ins between each fellow and their pod leader."
                  actions={
                    isLeader ? (
                      <div className="flex flex-wrap items-end gap-2">
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
                          <Button type="submit" size="sm">
                            Add Round
                          </Button>
                        </form>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const created = await generateLeaderRecords({
                                cohortId,
                              })
                              toast.success(
                                `Generated ${created} pod leader 1:1 records.`,
                              )
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to generate leader records.",
                              )
                            }
                          }}
                        >
                          Generate Leader Records
                        </Button>
                      </div>
                    ) : null
                  }
                />
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {instances.length === 0 ? (
                  <div className="border-t border-border px-4 py-8">
                    <EmptyState
                      title="No leader rounds yet"
                      description={
                        isLeader
                          ? "Add a round above to start tracking pod leader check-ins."
                          : "Your pod leader hasn't added any leader rounds yet."
                      }
                    />
                  </div>
                ) : (
                  <div className="overflow-auto border-t border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="sticky left-0 z-20 bg-card">
                            Fellow
                          </TableHead>
                          {instances.map((instance) => (
                            <TableHead key={instance._id} className="min-w-40">
                              {instance.title}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderFellows.map((fellow) => (
                          <TableRow key={fellow._id} className="group">
                            <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/50">
                              {fellow.name}
                            </TableCell>
                            {instances.map((instance) => {
                              const record = records.find(
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
                <SectionHeader
                  title="Scheduling links"
                  description="Scheduling links fellows shared for booking 1:1s."
                />
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
