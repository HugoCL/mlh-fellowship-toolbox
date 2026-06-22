import type { ReactNode } from "react"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function placeholderKeys(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index}`)
}

/** Full page loading shell with header placeholder and body skeleton. */
export function PageSkeleton({
  title = "Loading…",
  description,
  width = "default",
  children,
}: {
  title?: string
  description?: string
  width?: "default" | "narrow" | "wide" | "full"
  children?: ReactNode
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageBody width={width}>
        {children ?? <SkeletonList count={3} />}
      </PageBody>
    </>
  )
}

/** Stacked card-shaped skeleton blocks. */
export function SkeletonList({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {placeholderKeys("skeleton-list", count).map((key) => (
        <Skeleton key={key} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

/** Responsive grid of card skeletons. */
export function SkeletonCardGrid({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const columnClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2"

  return (
    <div className={cn("grid grid-cols-1 gap-4", columnClass, className)}>
      {placeholderKeys("skeleton-card", count).map((key) => (
        <Skeleton key={key} className="h-36 rounded-lg" />
      ))}
    </div>
  )
}

/** Table-shaped skeleton with header row and body rows. */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  const headerKeys = placeholderKeys("skeleton-table-head", columns)
  const rowKeys = placeholderKeys("skeleton-table-row", rows)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className,
      )}
    >
      <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
        {headerKeys.map((key) => (
          <Skeleton key={key} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {rowKeys.map((rowKey) => (
          <div key={rowKey} className="flex gap-4 px-4 py-3">
            {headerKeys.map((colKey) => (
              <Skeleton key={`${rowKey}-${colKey}`} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
