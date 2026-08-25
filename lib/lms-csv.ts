import { decodeHtmlEntities } from "./lms-notes-viewer"

export function parseLmsCsvRows(raw: string, delimiter = ","): string[][] {
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
    } else if (character === delimiter) {
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

export function cleanLmsCell(value: string | undefined): string {
  return decodeHtmlEntities(
    (value ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
}
