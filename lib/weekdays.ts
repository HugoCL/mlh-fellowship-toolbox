import type { Weekday } from "./programWeeks"

export const WEEKDAY_OPTIONS: ReadonlyArray<{
  value: Weekday
  label: string
}> = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function getWeekdayLabel(day: Weekday): string {
  return WEEKDAY_OPTIONS[day]?.label ?? "Unknown"
}
