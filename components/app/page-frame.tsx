import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const pageWidthClasses = {
  narrow: "mx-auto w-full max-w-2xl",
  default: "mx-auto w-full max-w-4xl",
  wide: "mx-auto w-full max-w-6xl",
  full: "w-full",
} as const

export type PageWidth = keyof typeof pageWidthClasses

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-2xl flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function PageBody({
  children,
  width = "default",
  className,
}: {
  children: ReactNode
  width?: PageWidth
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-6 overflow-auto px-6 py-6",
        pageWidthClasses[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageToolbar({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {title ? (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  )
}
