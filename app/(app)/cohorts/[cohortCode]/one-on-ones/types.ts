import type { Id } from "@/convex/_generated/dataModel"
import type { OneOnOneStatus } from "@/lib/status"

export type FellowSummary = {
  _id: Id<"fellows">
  name: string
  calendlyUrl?: string
}

export type PeerPair = {
  _id: Id<"peerOneOnOnes">
  fellowAId: Id<"fellows">
  fellowBId: Id<"fellows">
  status: OneOnOneStatus
}

export type LeaderInstance = {
  _id: Id<"oneOnOneInstances">
  title: string
}

export type LeaderRecord = {
  _id: Id<"leaderOneOnOnes">
  fellowId: Id<"fellows">
  instanceId: Id<"oneOnOneInstances">
  status: OneOnOneStatus
}

export const STATUS_RANK: Record<OneOnOneStatus, number> = {
  notStarted: 0,
  scheduled: 1,
  completed: 2,
}
