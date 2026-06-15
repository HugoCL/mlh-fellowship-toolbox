import { format, parseISO } from "date-fns"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

export function formatDateTime(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp))
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

export function toDateTimeLocalValue(timestamp: number): string {
  return format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm")
}

export function dateTimeLocalToTimestamp(value: string): number {
  return new Date(value).getTime()
}
