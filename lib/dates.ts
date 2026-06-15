import { format, parseISO } from "date-fns"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

export function formatWeekLabel(timestamp: number): string {
  return `Week of ${format(new Date(timestamp), "MMMM d")}`
}

export function toTimestamp(dateString: string): number {
  return parseISO(dateString).getTime()
}

export function toDateInputValue(timestamp: number): string {
  return format(new Date(timestamp), "yyyy-MM-dd")
}
