import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Single at-a-glance metric with label and optional detail. */
export function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      {detail ? (
        <span className="text-xs text-muted-foreground">{detail}</span>
      ) : null}
    </div>
  )
}

/** Horizontal row of Stat items with dividers — dashboard summary strip. */
export function StatStrip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Grid wrapper for multiple Stat blocks. */
export function StatGroup({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const columnClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2"

  return (
    <div className={cn("grid grid-cols-1 gap-4", columnClass, className)}>
      {children}
    </div>
  )
}
