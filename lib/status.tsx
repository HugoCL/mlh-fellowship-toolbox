import { ProgressBar } from "@/components/app/progress-bar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  className,
}: {
  label: string
  completed: number
  total: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <ProgressBar
        value={completed}
        max={total}
        aria-label={`${label}: ${completed} of ${total}`}
      />
    </div>
  )
}
