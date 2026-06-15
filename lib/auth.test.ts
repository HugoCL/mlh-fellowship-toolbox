import { describe, expect, it } from "vitest"
import { canonicalPair } from "../convex/lib/auth"

describe("canonicalPair", () => {
  it("orders fellows so the first id is less than the second", () => {
    const a = "fellow_a" as never
    const b = "fellow_b" as never

    expect(canonicalPair(a, b)).toEqual([a, b])
    expect(canonicalPair(b, a)).toEqual([a, b])
  })

  it("returns the same pair when ids are equal", () => {
    const id = "fellow_same" as never

    expect(canonicalPair(id, id)).toEqual([id, id])
  })
})
