import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getStatusLabel, type OneOnOneStatus } from "@/lib/status"

export function StatusSelect({
  value,
  ariaLabel,
  onChange,
  className,
}: {
  value: OneOnOneStatus
  ariaLabel: string
  onChange: (status: OneOnOneStatus) => void
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return
        onChange(next as OneOnOneStatus)
      }}
    >
      <SelectTrigger
        size="sm"
        className={className ?? "w-32"}
        aria-label={ariaLabel}
      >
        <SelectValue>{getStatusLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="notStarted">Not yet</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
