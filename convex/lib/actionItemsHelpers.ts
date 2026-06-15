import type { Doc, Id } from "../_generated/dataModel"

export function isFellowTargeted(
  item: Pick<Doc<"actionItems">, "targetAllFellows" | "targetFellowIds">,
  fellowId: Id<"fellows">,
): boolean {
  if (item.targetAllFellows) {
    return true
  }
  return item.targetFellowIds?.includes(fellowId) ?? false
}

export function getTargetedFellows(
  item: Pick<Doc<"actionItems">, "targetAllFellows" | "targetFellowIds">,
  fellows: Doc<"fellows">[],
): Doc<"fellows">[] {
  if (item.targetAllFellows) {
    return fellows
  }
  const targetIds = new Set(item.targetFellowIds ?? [])
  return fellows.filter((fellow) => targetIds.has(fellow._id))
}

export function getTargetCount(
  item: Pick<Doc<"actionItems">, "targetAllFellows" | "targetFellowIds">,
  fellowCount: number,
): number {
  if (item.targetAllFellows) {
    return fellowCount
  }
  return item.targetFellowIds?.length ?? 0
}

export function validateActionItemFields(args: {
  title: string
  message: string
  dueAt: number
  targetAllFellows: boolean
  targetFellowIds?: Id<"fellows">[]
  requireFutureDueAt?: boolean
}): void {
  const title = args.title.trim()
  const message = args.message.trim()
  if (!title) {
    throw new Error("Title is required")
  }
  if (!message) {
    throw new Error("Message is required")
  }
  if (args.requireFutureDueAt && args.dueAt <= Date.now()) {
    throw new Error("Due date must be in the future")
  }
  if (!args.targetAllFellows) {
    if (!args.targetFellowIds || args.targetFellowIds.length === 0) {
      throw new Error("Select at least one fellow")
    }
  }
}
