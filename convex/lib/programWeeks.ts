export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export type ProgramWeek = {
  weekNumber: number
  weekStart: number
  weekLabel: string
}

export function getProgramWeeks(
  startDate: number,
  endDate: number,
): ProgramWeek[] {
  if (endDate < startDate) {
    return []
  }

  const weeks: ProgramWeek[] = []
  let weekStart = startDate
  let weekNumber = 1

  while (weekStart <= endDate) {
    weeks.push({
      weekNumber,
      weekStart,
      weekLabel: `Week ${weekNumber}`,
    })
    weekStart += MS_PER_WEEK
    weekNumber += 1
  }

  return weeks
}

export function isSameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}
