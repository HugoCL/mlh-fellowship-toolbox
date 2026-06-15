import type { ReactNode } from "react"

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
    <div className="flex flex-col gap-4 border-b border-border/70 bg-background/80 px-6 py-5 backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
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

export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto px-6 py-6">
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
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/40 p-4">
      {title ? (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  )
}
