export function timeInputToMinutes(value: string): number {
  const [hours, minutes] = value
    .split(":")
    .map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error("Invalid time")
  }
  return hours * 60 + minutes
}

export function minutesToTimeInput(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const

export function formatCadenceLabel(
  cadence: "daily" | "weekly" | "monthly",
  weekdays?: number[],
): string {
  if (cadence === "daily") {
    return "Daily"
  }
  if (cadence === "monthly") {
    return "Monthly"
  }
  if (!weekdays?.length) {
    return "Weekly"
  }
  const labels = WEEKDAY_OPTIONS.filter((day) =>
    weekdays.includes(day.value),
  ).map((day) => day.label)
  return `Weekly (${labels.join(", ")})`
}
