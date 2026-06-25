import { describe, expect, it } from "vitest"
import {
  decodeHtmlEntities,
  normalizeWhitespace,
  parseLmsNotesJson,
  parseLmsNotesUpload,
  parseSubmittedDate,
  shuffleNotes,
  sortNotesByName,
  sortNotesBySubmission,
} from "./lms-notes-viewer"

const RETRO_JSON = JSON.stringify([
  [
    {
      userfullname: "Paul Contreras",
      groups: "26.SUM.B.5",
      emailaddress: "paul@example.com",
      date: "Saturday, 20 June 2026, 4:30 AM",
      whatdidyouachievethisweek: "Did things",
      whatwentwellthisweekpastweek: "It went well",
      whatcouldvegonebetterthispastweek: "since it&#039;s the first week",
      whathaveyoulearnedthisweek: "Learned a lot",
      whatstillpuzzlesyou: "Nothing puzzles me",
    },
  ],
])

const STANDUP_JSON = JSON.stringify([
  [
    {
      userfullname: "Sage Ebert",
      groups: "26.SUM.B.5",
      emailaddress: "sage@example.com",
      date: "Wednesday, 17 June 2026, 10:02 PM",
      whathaveyouachievedsincethelaststandup:
        "Done:      -- Read handbook      -- Generated repo",
      whatblockersareyoucurrentlyencountering: "Few questions",
      whatareyourprioritiesyoullcontributetountilthenextstandup:
        "Github assignments",
      sincethelaststandupivemadeprogressrelatingtomyprojectcurriculum:
        "Somewhat agree",
      shoutouts: "",
    },
  ],
])

describe("parseLmsNotesJson", () => {
  it("parses nested LMS arrays into a single list", () => {
    const result = parseLmsNotesJson(RETRO_JSON)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.notes).toHaveLength(1)
    expect(result.data.notes[0]?.name).toBe("Paul Contreras")
    expect(result.data.notes[0]?.email).toBe("paul@example.com")
  })

  it("detects retro exports", () => {
    const result = parseLmsNotesJson(RETRO_JSON)
    expect(result.ok && result.data.kind).toBe("retro")
  })

  it("detects standup exports", () => {
    const result = parseLmsNotesJson(STANDUP_JSON)
    expect(result.ok && result.data.kind).toBe("standup")
  })

  it("decodes embedded HTML entities in section content", () => {
    const result = parseLmsNotesJson(RETRO_JSON)
    if (!result.ok) throw new Error("expected ok")
    const section = result.data.notes[0]?.sections.find(
      (s) => s.key === "whatcouldvegonebetterthispastweek",
    )
    expect(section?.content).toBe("since it's the first week")
  })

  it("marks blank fields (e.g. empty shoutouts) as empty", () => {
    const result = parseLmsNotesJson(STANDUP_JSON)
    if (!result.ok) throw new Error("expected ok")
    const shoutouts = result.data.notes[0]?.sections.find(
      (s) => s.key === "shoutouts",
    )
    expect(shoutouts?.isEmpty).toBe(true)
    expect(shoutouts?.content).toBe("")
  })

  it("restores line breaks from flattened space runs", () => {
    const result = parseLmsNotesJson(STANDUP_JSON)
    if (!result.ok) throw new Error("expected ok")
    const achieved = result.data.notes[0]?.sections.find(
      (s) => s.key === "whathaveyouachievedsincethelaststandup",
    )
    expect(achieved?.content).toBe("Done:\n-- Read handbook\n-- Generated repo")
  })

  it("returns a friendly error for invalid JSON", () => {
    const result = parseLmsNotesJson("not json")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/valid JSON/i)
  })

  it("returns an error for empty input", () => {
    const result = parseLmsNotesJson("   ")
    expect(result.ok).toBe(false)
  })

  it("returns an error when notes can't be classified", () => {
    const result = parseLmsNotesJson(JSON.stringify([{ foo: "bar" }]))
    expect(result.ok).toBe(false)
  })
})

describe("parseLmsNotesUpload", () => {
  it("parses JSON uploaded from a supported file", () => {
    const result = parseLmsNotesUpload({
      fileName: "standup-export.json",
      content: STANDUP_JSON,
    })
    expect(result.ok && result.data.kind).toBe("standup")
  })

  it("rejects unsupported file types before parsing", () => {
    const result = parseLmsNotesUpload({
      fileName: "standup-export.csv",
      content: STANDUP_JSON,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/JSON file/i)
  })
})

describe("decodeHtmlEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeHtmlEntities("I&#039;m &amp; you")).toBe("I'm & you")
    expect(decodeHtmlEntities("&quot;hi&quot;")).toBe('"hi"')
    expect(decodeHtmlEntities("&#x27;x&#x27;")).toBe("'x'")
  })

  it("leaves unknown entities untouched", () => {
    expect(decodeHtmlEntities("&unknownentity;")).toBe("&unknownentity;")
  })
})

describe("normalizeWhitespace", () => {
  it("collapses double spaces but keeps single spaces", () => {
    expect(normalizeWhitespace("hello  world")).toBe("hello world")
  })

  it("converts long space runs to line breaks", () => {
    expect(normalizeWhitespace("a     b")).toBe("a\nb")
  })
})

describe("parseSubmittedDate", () => {
  it("parses an LMS date string", () => {
    expect(parseSubmittedDate("Saturday, 20 June 2026, 4:30 AM")).toBe(
      Date.UTC(2026, 5, 20, 4, 30),
    )
  })

  it("handles PM and noon/midnight correctly", () => {
    expect(parseSubmittedDate("Friday, 19 June 2026, 6:13 PM")).toBe(
      Date.UTC(2026, 5, 19, 18, 13),
    )
    expect(parseSubmittedDate("Friday, 19 June 2026, 12:00 PM")).toBe(
      Date.UTC(2026, 5, 19, 12, 0),
    )
    expect(parseSubmittedDate("Friday, 19 June 2026, 12:30 AM")).toBe(
      Date.UTC(2026, 5, 19, 0, 30),
    )
  })

  it("returns null for unrecognized formats", () => {
    expect(parseSubmittedDate("sometime last week")).toBeNull()
  })
})

describe("shuffleNotes", () => {
  it("is deterministic for the same seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffleNotes(items, 42)).toEqual(shuffleNotes(items, 42))
  })

  it("does not mutate the input", () => {
    const items = [1, 2, 3]
    const copy = [...items]
    shuffleNotes(items, 7)
    expect(items).toEqual(copy)
  })

  it("produces a permutation of the original items", () => {
    const items = [1, 2, 3, 4, 5]
    const shuffled = shuffleNotes(items, 123)
    expect([...shuffled].sort()).toEqual([...items].sort())
  })

  it("usually differs between distinct seeds", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(shuffleNotes(items, 1)).not.toEqual(shuffleNotes(items, 2))
  })
})

describe("sorting", () => {
  const notes = [
    { name: "Zoe", submittedAt: 30 },
    { name: "Amy", submittedAt: null },
    { name: "Bob", submittedAt: 10 },
  ]

  it("sorts by name", () => {
    expect(sortNotesByName(notes).map((n) => n.name)).toEqual([
      "Amy",
      "Bob",
      "Zoe",
    ])
  })

  it("sorts by submission time with nulls last", () => {
    expect(sortNotesBySubmission(notes).map((n) => n.name)).toEqual([
      "Bob",
      "Zoe",
      "Amy",
    ])
  })
})
