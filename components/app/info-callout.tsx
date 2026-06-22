import {
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type InfoCalloutVariant = "info" | "warning" | "success" | "neutral"

const variantStyles: Record<
  InfoCalloutVariant,
  { container: string; icon: string; Icon: LucideIcon }
> = {
  info: {
    container: "border-info/25 bg-info/8 text-foreground",
    icon: "text-info",
    Icon: InfoIcon,
  },
  warning: {
    container: "border-warning/30 bg-warning/10 text-foreground",
    icon: "text-warning",
    Icon: AlertCircleIcon,
  },
  success: {
    container: "border-success/25 bg-success/8 text-foreground",
    icon: "text-success",
    Icon: CheckCircle2Icon,
  },
  neutral: {
    container: "border-border bg-muted/40 text-foreground",
    icon: "text-muted-foreground",
    Icon: InfoIcon,
  },
}

/** Muted contextual note with icon — replaces ad-hoc Info + paragraph blocks. */
export function InfoCallout({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode
  variant?: InfoCalloutVariant
  className?: string
}) {
  const { container, icon, Icon } = variantStyles[variant]

  return (
    <p
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground",
        container,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  )
}
