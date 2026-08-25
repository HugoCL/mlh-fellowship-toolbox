import { cleanLmsCell, parseLmsCsvRows } from "./lms-csv"

export const ATTENDANCE_REQUIREMENT_PERCENT = 90

export type AttendanceFellow = {
  name: string
  email: string
  presentCount: number
  lateCount: number
  excusedCount: number
  absentCount: number
  sessionCount: number
  absenceDates: string[]
  excusedDates: string[]
}

export type ParsedAttendanceReport = {
  fellows: AttendanceFellow[]
  sessionNames: string[]
  sessionCount: number
  sourceRowCount: number
}

export type AttendanceReportParseResult =
  | { ok: true; data: ParsedAttendanceReport }
  | { ok: false; error: string }

export type AttendanceReportUpload = {
  fileName?: string
  content: string
}

export type AttendanceSummary = {
  attendedSessionCount: number
  eligibleSessionCount: number
  percentage: number
  meetsRequirement: boolean
}

function normalizeHeader(value: string): string {
  return cleanLmsCell(value).replace(/\s+/g, " ").trim()
}

function sessionLabel(value: string): string | null {
  const header = normalizeHeader(value)
  const month =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
  const match =
    header.match(
      new RegExp(`\\b${month}\\s+\\d{1,2}(?:,?\\s+\\d{4})?\\b`, "i"),
    ) ??
    header.match(
      new RegExp(`\\b\\d{1,2}\\s+${month}(?:\\s+\\d{4})?\\b`, "i"),
    ) ??
    header.match(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/) ??
    header.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/)
  return match?.[0] ?? null
}

function isHeaderRow(row: string[]): boolean {
  const cells = row.map(cleanLmsCell)
  const hasEmail = cells.some((cell) => /^Email address$/i.test(cell))
  const hasName = cells.some((cell) =>
    /^First name\s*\/\s*Last name$/i.test(cell),
  )
  const hasBlankNameColumn = cleanLmsCell(row[0]) === ""
  const hasSession = cells.some((cell) => sessionLabel(cell) !== null)
  return hasEmail && (hasName || hasBlankNameColumn) && hasSession
}

function parseStatus(value: string | undefined): "P" | "L" | "E" | "A" | null {
  const status = cleanLmsCell(value)
  if (/^(?:P|Present)\b/i.test(status)) return "P"
  if (/^(?:L|Late)\b/i.test(status)) return "L"
  if (/^(?:E|Excused)\b/i.test(status)) return "E"
  if (/^(?:A|Absent)\b/i.test(status)) return "A"
  return null
}

function getRows(raw: string): string[][] | null {
  const delimiters = raw.includes("\t") ? ["\t", ","] : [",", "\t"]
  for (const delimiter of delimiters) {
    try {
      const rows = parseLmsCsvRows(raw, delimiter)
      if (rows.findIndex(isHeaderRow) !== -1) {
        return rows
      }
    } catch {
      // Try the other supported delimiter before reporting an invalid export.
    }
  }
  return null
}

export function parseLmsAttendanceReportCsv(
  raw: string,
): AttendanceReportParseResult {
  if (raw.trim().length === 0) {
    return {
      ok: false,
      error: "Paste the LMS attendance report to get started.",
    }
  }

  const rows = getRows(raw)
  const headerIndex = rows?.findIndex(isHeaderRow) ?? -1
  if (!rows || headerIndex === -1) {
    return {
      ok: false,
      error:
        "Couldn't find the LMS attendance header. Paste the full report with its dated session columns.",
    }
  }

  const sessionColumns = (rows[headerIndex] ?? [])
    .map((value, index) => ({ index, label: sessionLabel(value) }))
    .filter((column): column is { index: number; label: string } =>
      Boolean(column.label),
    )

  const fellowRows = rows
    .slice(headerIndex + 1)
    .map((row) => ({
      row,
      name: cleanLmsCell(row[0]),
      email: cleanLmsCell(row[1]),
    }))
    .filter(
      ({ name, email }) =>
        name.length > 0 && email.length > 0 && !/^Summary$/i.test(name),
    )

  if (fellowRows.length === 0) {
    return {
      ok: false,
      error: "No fellow rows were found in that attendance report.",
    }
  }

  const fellows = fellowRows.map(({ row, name, email }) => {
    const attendance: AttendanceFellow = {
      name,
      email,
      presentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      absentCount: 0,
      sessionCount: 0,
      absenceDates: [],
      excusedDates: [],
    }

    for (const column of sessionColumns) {
      const status = parseStatus(row[column.index])
      if (!status) continue
      attendance.sessionCount += 1
      if (status === "P") attendance.presentCount += 1
      if (status === "L") attendance.lateCount += 1
      if (status === "E") {
        attendance.excusedCount += 1
        attendance.excusedDates.push(column.label)
      }
      if (status === "A") {
        attendance.absentCount += 1
        attendance.absenceDates.push(column.label)
      }
    }

    return attendance
  })

  const sessionNames = sessionColumns
    .filter(({ index }) =>
      fellowRows.some(({ row }) => parseStatus(row[index]) !== null),
    )
    .map(({ label }) => label)

  if (sessionNames.length === 0) {
    return {
      ok: false,
      error: "No taken attendance days were found in that report.",
    }
  }

  return {
    ok: true,
    data: {
      fellows,
      sessionNames,
      sessionCount: sessionNames.length,
      sourceRowCount: fellowRows.length,
    },
  }
}

export function parseLmsAttendanceReportUpload(
  upload: AttendanceReportUpload,
): AttendanceReportParseResult {
  const fileName = upload.fileName?.trim()
  if (fileName && !/\.(csv|txt)$/i.test(fileName)) {
    return {
      ok: false,
      error: "Drop a CSV file or paste the attendance report instead.",
    }
  }
  return parseLmsAttendanceReportCsv(upload.content)
}

export function getAttendanceSummary(
  fellow: Pick<
    AttendanceFellow,
    "presentCount" | "lateCount" | "excusedCount" | "sessionCount"
  >,
): AttendanceSummary {
  const eligibleSessionCount = Math.max(
    fellow.sessionCount - fellow.excusedCount,
    0,
  )
  const attendedSessionCount = fellow.presentCount + fellow.lateCount
  const percentage =
    eligibleSessionCount === 0
      ? 100
      : (attendedSessionCount / eligibleSessionCount) * 100

  return {
    attendedSessionCount,
    eligibleSessionCount,
    percentage,
    meetsRequirement: percentage >= ATTENDANCE_REQUIREMENT_PERCENT,
  }
}

export function sortAttendanceFellows(
  fellows: readonly AttendanceFellow[],
): AttendanceFellow[] {
  return fellows.slice().sort((a, b) => {
    const percentageDifference =
      getAttendanceSummary(a).percentage - getAttendanceSummary(b).percentage
    if (percentageDifference !== 0) return percentageDifference
    return a.name.localeCompare(b.name)
  })
}
