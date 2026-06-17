"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

type LabeledCheckboxProps = {
  id: string
  label: string
  checked: boolean
  ariaLabel: string
  className?: string
  onCheckedChange: (checked: boolean) => void
}

export function LabeledCheckbox({
  id,
  label,
  checked,
  ariaLabel,
  className,
  onCheckedChange,
}: LabeledCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("flex items-center gap-2 text-sm", className)}
    >
      <Checkbox
        id={id}
        checked={checked}
        aria-label={ariaLabel}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {label}
    </label>
  )
}
