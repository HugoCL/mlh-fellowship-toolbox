import { cn } from "@/lib/utils"

export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
        FT
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
          Fellowship Toolbox
        </span>
        <span className="text-xs text-muted-foreground">
          MLH Fellowship pod workspace
        </span>
      </div>
    </div>
  )
}
