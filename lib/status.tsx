import { Badge } from "@/components/ui/badge"

export type OneOnOneStatus = "notStarted" | "scheduled" | "completed"

const statusLabels: Record<OneOnOneStatus, string> = {
  notStarted: "Not yet",
  scheduled: "Scheduled",
  completed: "Completed",
}

export function getStatusLabel(status: OneOnOneStatus): string {
  return statusLabels[status]
}

export function StatusBadge({ status }: { status: OneOnOneStatus }) {
  const variant =
    status === "completed"
      ? "default"
      : status === "scheduled"
        ? "secondary"
        : "outline"

  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>
}

export function ProgressStat({
  label,
  completed,
  total,
}: {
  label: string
  completed: number
  total: number
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
