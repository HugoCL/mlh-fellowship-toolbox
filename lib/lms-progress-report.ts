import { decodeHtmlEntities } from "./lms-notes-viewer"

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

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  const pushField = () => {
    row.push(field)
    field = ""
  }

  const pushRow = () => {
    pushField()
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row)
    }
    row = []
  }

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index]

    if (quoted) {
      if (character === '"') {
        if (raw[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ",") {
      pushField()
    } else if (character === "\n") {
      pushRow()
    } else if (character !== "\r") {
      field += character
    }
  }

  if (quoted) {
    throw new Error("Unclosed CSV field")
  }

  if (field.length > 0 || row.length > 0) {
    pushRow()
  }

  return rows
}

function cleanCell(value: string | undefined): string {
  return decodeHtmlEntities(
    (value ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
}

function isHeaderRow(row: string[]): boolean {
  const cells = row.map(cleanCell)
  return (
    cells.some((cell) => /^First name\s*\/\s*Last name$/i.test(cell)) &&
    cells.some((cell) => /^Email address$/i.test(cell))
  )
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

  let rows: string[][]
  try {
    rows = parseCsvRows(raw)
  } catch {
    return {
      ok: false,
      error:
        "That doesn't look like a valid CSV. Export the report again and try.",
    }
  }

  const headerIndex = rows.findIndex(isHeaderRow)
  if (headerIndex === -1) {
    return {
      ok: false,
      error:
        "Couldn't find the LMS activity completion header. Paste the full CSV export.",
    }
  }

  const headers = rows[headerIndex]?.map(cleanCell) ?? []
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
    .map((row) => ({ row, name: cleanCell(row[0]) }))
    .filter(({ name }) => name.length > 0)

  const fellows = fellowRows.flatMap(({ row, name }) => {
    const pendingTasks = taskColumns.flatMap(({ title, index }) => {
      const status = cleanCell(row[index])
      if (isCompleted(status)) return []
      return [title]
    })

    if (pendingTasks.length === 0) return []
    return [
      {
        name,
        email: cleanCell(row[1]),
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
