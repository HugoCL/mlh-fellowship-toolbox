import { cn } from "@/lib/utils"

type ProgressBarProps = {
  value: number
  max?: number
  className?: string
  trackClassName?: string
  indicatorClassName?: string
  "aria-label"?: string
}

/** Horizontal progress indicator — use instead of inline width-style markup. */
export function ProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  indicatorClassName,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const percent =
    max === 0 ? 0 : Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-muted",
        trackClassName,
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none",
          indicatorClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
