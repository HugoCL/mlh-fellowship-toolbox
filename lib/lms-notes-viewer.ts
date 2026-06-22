export type NoteKind = "retro" | "standup"

export type NoteSection = {
  key: string
  label: string
  content: string
  isHighlight: boolean
  isEmpty: boolean
}

export type FellowNote = {
  name: string
  email: string
  group: string
  submittedAtLabel: string
  /** Best-effort sortable timestamp parsed from the LMS date string. */
  submittedAt: number | null
  sections: NoteSection[]
}

export type ParsedNotes = {
  kind: NoteKind
  notes: FellowNote[]
}

export type ParseResult =
  | { ok: true; data: ParsedNotes }
  | { ok: false; error: string }

type SectionDef = { key: string; label: string; isHighlight: boolean }

const RETRO_SECTIONS: SectionDef[] = [
  {
    key: "whatdidyouachievethisweek",
    label: "What I achieved this week",
    isHighlight: false,
  },
  {
    key: "whatwentwellthisweekpastweek",
    label: "What went well",
    isHighlight: true,
  },
  {
    key: "whatcouldvegonebetterthispastweek",
    label: "What could've gone better",
    isHighlight: true,
  },
  {
    key: "whathaveyoulearnedthisweek",
    label: "What I learned",
    isHighlight: false,
  },
  {
    key: "whatstillpuzzlesyou",
    label: "What still puzzles me",
    isHighlight: true,
  },
]

const STANDUP_SECTIONS: SectionDef[] = [
  {
    key: "whathaveyouachievedsincethelaststandup",
    label: "Achieved since last standup",
    isHighlight: false,
  },
  {
    key: "whatblockersareyoucurrentlyencountering",
    label: "Blockers",
    isHighlight: true,
  },
  {
    key: "whatareyourprioritiesyoullcontributetountilthenextstandup",
    label: "Priorities until next standup",
    isHighlight: true,
  },
  {
    key: "sincethelaststandupivemadeprogressrelatingtomyprojectcurriculum",
    label: "Progress on project / curriculum",
    isHighlight: false,
  },
  {
    key: "shoutouts",
    label: "Shoutouts",
    isHighlight: true,
  },
]

const SECTIONS_BY_KIND: Record<NoteKind, SectionDef[]> = {
  retro: RETRO_SECTIONS,
  standup: STANDUP_SECTIONS,
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

/** Decode HTML entities that the LMS export embeds (e.g. `&#039;` → `'`). */
export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X"
        const codePoint = Number.parseInt(
          isHex ? body.slice(2) : body.slice(1),
          isHex ? 16 : 10,
        )
        if (Number.isNaN(codePoint)) {
          return match
        }
        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return match
        }
      }
      const named = NAMED_ENTITIES[body.toLowerCase()]
      return named ?? match
    },
  )
}

/**
 * The LMS flattens line breaks into runs of spaces. Restore readable
 * structure: long space runs become line breaks, double spaces collapse,
 * and excessive blank lines are trimmed.
 */
export function normalizeWhitespace(value: string): string {
  const withBreaks = value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{3,}/g, "\n")
    .replace(/[ \t]{2}/g, " ")

  const lines = withBreaks
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return normalizeWhitespace(decodeHtmlEntities(value))
}

/** Parse an LMS date string like "Saturday, 20 June 2026, 4:30 AM". */
export function parseSubmittedDate(value: string): number | null {
  const match = value
    .trim()
    .match(
      /^(?:[A-Za-z]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    )
  if (!match) {
    return null
  }
  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, meridiemRaw] = match
  const month = MONTHS[monthRaw.toLowerCase()]
  if (month === undefined) {
    return null
  }
  const day = Number.parseInt(dayRaw, 10)
  const year = Number.parseInt(yearRaw, 10)
  let hour = Number.parseInt(hourRaw, 10)
  const minute = Number.parseInt(minuteRaw, 10)
  const meridiem = meridiemRaw.toUpperCase()
  if (meridiem === "PM" && hour !== 12) {
    hour += 12
  }
  if (meridiem === "AM" && hour === 12) {
    hour = 0
  }
  return Date.UTC(year, month, day, hour, minute)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Flatten the LMS export which is often wrapped as `[[{...}]]`. */
function flattenRecords(value: unknown): Record<string, unknown>[] {
  if (isPlainRecord(value)) {
    return [value]
  }
  if (!Array.isArray(value)) {
    return []
  }
  const records: Record<string, unknown>[] = []
  for (const entry of value) {
    records.push(...flattenRecords(entry))
  }
  return records
}

function detectKind(records: Record<string, unknown>[]): NoteKind | null {
  for (const record of records) {
    for (const section of STANDUP_SECTIONS) {
      if (section.key in record) {
        return "standup"
      }
    }
    for (const section of RETRO_SECTIONS) {
      if (section.key in record) {
        return "retro"
      }
    }
  }
  return null
}

function toFellowNote(
  record: Record<string, unknown>,
  sectionDefs: SectionDef[],
): FellowNote {
  const submittedAtLabel = cleanText(record.date)
  const sections = sectionDefs.map((def) => {
    const content = cleanText(record[def.key])
    return {
      key: def.key,
      label: def.label,
      content,
      isHighlight: def.isHighlight,
      isEmpty: content.length === 0,
    }
  })

  return {
    name: cleanText(record.userfullname) || "Unknown fellow",
    email: cleanText(record.emailaddress),
    group: cleanText(record.groups),
    submittedAtLabel,
    submittedAt: parseSubmittedDate(
      typeof record.date === "string" ? record.date : "",
    ),
    sections,
  }
}

export function parseLmsNotesJson(raw: string): ParseResult {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: "Paste the LMS export JSON to get started." }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      ok: false,
      error:
        "That doesn't look like valid JSON. Copy the full export and try again.",
    }
  }

  const records = flattenRecords(parsed)
  if (records.length === 0) {
    return { ok: false, error: "No submissions were found in that export." }
  }

  const kind = detectKind(records)
  if (!kind) {
    return {
      ok: false,
      error:
        "Couldn't tell if these are retro or standup notes. Check the export.",
    }
  }

  const sectionDefs = SECTIONS_BY_KIND[kind]
  const notes = records.map((record) => toFellowNote(record, sectionDefs))

  return { ok: true, data: { kind, notes } }
}

/** Deterministic PRNG so a given seed always yields the same order. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic Fisher-Yates shuffle that returns a new array. */
export function shuffleNotes<T>(items: readonly T[], seed: number): T[] {
  const result = items.slice()
  const random = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export function sortNotesByName<T extends { name: string }>(notes: T[]): T[] {
  return notes.slice().sort((a, b) => a.name.localeCompare(b.name))
}

export function sortNotesBySubmission<
  T extends { submittedAt: number | null; name: string },
>(notes: T[]): T[] {
  return notes.slice().sort((a, b) => {
    if (a.submittedAt === null && b.submittedAt === null) {
      return a.name.localeCompare(b.name)
    }
    if (a.submittedAt === null) {
      return 1
    }
    if (b.submittedAt === null) {
      return -1
    }
    return a.submittedAt - b.submittedAt
  })
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  retro: "Retro notes",
  standup: "Standup notes",
}
