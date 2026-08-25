import { cleanLmsCell, parseLmsCsvRows } from "./lms-csv"

export type ProgressFellow = {
  name: string
  email: string
  pendingTasks: string[]
}

export type ParsedProgressReport = {
  fellows: ProgressFellow[]
  taskNames: string[]
  taskCount: number
  sourceRowCount: number
}

export type ProgressReportParseResult =
  | { ok: true; data: ParsedProgressReport }
  | { ok: false; error: string }

export type ProgressReportUpload = {
  fileName?: string
  content: string
}

function isHeaderRow(row: string[]): boolean {
  const cells = row.map(cleanLmsCell)
  const hasEmail = cells.some((cell) => /^Email address$/i.test(cell))
  const hasName = cells.some((cell) =>
    /^First name\s*\/\s*Last name$/i.test(cell),
  )
  const hasBlankNameColumn = cleanLmsCell(row[0]) === ""
  return hasEmail && (hasName || hasBlankNameColumn)
}

function isTaskHeader(value: string): boolean {
  return /^Task(?:\s+\d+)?\s*:/i.test(value)
}

function isCompleted(value: string): boolean {
  return /^Completed\b/i.test(value)
}

export function parseLmsProgressReportCsv(
  raw: string,
): ProgressReportParseResult {
  if (raw.trim().length === 0) {
    return {
      ok: false,
      error: "Paste the LMS activity completion CSV to get started.",
    }
  }

  const delimiters = raw.includes("\t") ? ["\t", ","] : [","]
  let rows: string[][] | null = null
  let headerIndex = -1
  for (const delimiter of delimiters) {
    try {
      const candidateRows = parseLmsCsvRows(raw, delimiter)
      const candidateHeaderIndex = candidateRows.findIndex(isHeaderRow)
      if (candidateHeaderIndex !== -1) {
        rows = candidateRows
        headerIndex = candidateHeaderIndex
        break
      }
    } catch {
      // Try the next supported delimiter before reporting an invalid export.
    }
  }

  if (!rows || headerIndex === -1) {
    return {
      ok: false,
      error:
        "Couldn't find the LMS activity completion header. Paste the full CSV export.",
    }
  }

  const headers = rows[headerIndex]?.map(cleanLmsCell) ?? []
  const taskColumns = headers
    .map((title, index) => ({ title, index }))
    .filter(({ title }) => isTaskHeader(title))

  if (taskColumns.length === 0) {
    return {
      ok: false,
      error: "No Task: columns were found in that report.",
    }
  }

  const fellowRows = rows
    .slice(headerIndex + 1)
    .map((row) => ({ row, name: cleanLmsCell(row[0]) }))
    .filter(({ name }) => name.length > 0)

  const fellows = fellowRows.flatMap(({ row, name }) => {
    const pendingTasks = taskColumns.flatMap(({ title, index }) => {
      const status = cleanLmsCell(row[index])
      if (isCompleted(status)) return []
      return [title]
    })

    if (pendingTasks.length === 0) return []
    return [
      {
        name,
        email: cleanLmsCell(row[1]),
        pendingTasks,
      },
    ]
  })

  return {
    ok: true,
    data: {
      fellows,
      taskNames: taskColumns.map(({ title }) => title),
      taskCount: taskColumns.length,
      sourceRowCount: fellowRows.length,
    },
  }
}

export function parseLmsProgressReportUpload(
  upload: ProgressReportUpload,
): ProgressReportParseResult {
  const fileName = upload.fileName?.trim()
  if (fileName && !/\.(csv|txt)$/i.test(fileName)) {
    return {
      ok: false,
      error: "Drop a CSV file or paste the activity completion export instead.",
    }
  }
  return parseLmsProgressReportCsv(upload.content)
}

export function filterProgressFellowsByTasks(
  fellows: readonly ProgressFellow[],
  excludedTasks: ReadonlySet<string>,
): ProgressFellow[] {
  return fellows.flatMap((fellow) => {
    const pendingTasks = fellow.pendingTasks.filter(
      (task) => !excludedTasks.has(task),
    )
    return pendingTasks.length > 0 ? [{ ...fellow, pendingTasks }] : []
  })
}

export function sortProgressFellows(
  fellows: readonly ProgressFellow[],
  sortBy: "name" | "pending",
): ProgressFellow[] {
  return fellows.slice().sort((a, b) => {
    if (
      sortBy === "pending" &&
      a.pendingTasks.length !== b.pendingTasks.length
    ) {
      return b.pendingTasks.length - a.pendingTasks.length
    }
    return a.name.localeCompare(b.name)
  })
}
