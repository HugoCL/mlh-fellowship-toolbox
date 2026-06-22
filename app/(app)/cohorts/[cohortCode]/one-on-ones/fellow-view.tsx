"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel"
import { type OneOnOneStatus, StatusBadge } from "@/lib/status"
import { StatusSelect } from "./status-select"
import {
  type FellowSummary,
  type LeaderInstance,
  type LeaderRecord,
  type PeerPair,
  STATUS_RANK,
} from "./types"

export function FellowOneOnOnesView({
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
        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
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
        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
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
              onChange={(next) =>
                setLeaderStatus(myFellowId, instance._id, next)
              }
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
      <PageBody width="default">
        <InfoCallout variant="info">
          Schedule each 1:1, then mark it{" "}
          <span className="font-medium text-foreground">Completed</span> once
          you&apos;ve met.
        </InfoCallout>

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
                  <SectionHeader
                    title="My peer 1:1s"
                    description={
                      pendingPeerItems.length > 0
                        ? `${pendingPeerItems.length} pending — schedule, then mark completed.`
                        : "All caught up. You can still update past 1:1s below."
                    }
                  />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {pendingPeerItems.length > 0 ? (
                    <div className="divide-y divide-border border-t border-border">
                      {pendingPeerItems.map(renderPeerRow)}
                    </div>
                  ) : null}
                  {completedPeerItems.length > 0 ? (
                    <>
                      <div className="border-t border-border px-4 pt-4 pb-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Completed
                        </p>
                      </div>
                      <div className="divide-y divide-border border-t border-border">
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
                  <SectionHeader
                    title="My pod leader 1:1s"
                    description={
                      pendingLeaderItems.length > 0
                        ? `${pendingLeaderItems.length} pending check-in${
                            pendingLeaderItems.length === 1 ? "" : "s"
                          } with your pod leader.`
                        : "All caught up with your pod leader check-ins."
                    }
                  />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {pendingLeaderItems.length > 0 ? (
                    <div className="divide-y divide-border border-t border-border">
                      {pendingLeaderItems.map(renderLeaderRow)}
                    </div>
                  ) : null}
                  {completedLeaderItems.length > 0 ? (
                    <>
                      <div className="border-t border-border px-4 pt-4 pb-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Completed
                        </p>
                      </div>
                      <div className="divide-y divide-border border-t border-border">
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
