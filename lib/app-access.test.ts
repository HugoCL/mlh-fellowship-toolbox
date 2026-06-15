import { describe, expect, it } from "vitest"
import { getNotInvitedMessage, NOT_INVITED_PREFIX } from "./app-access"

describe("getNotInvitedMessage", () => {
  it("extracts the user-facing message from a not-invited error", () => {
    const error = new Error(
      `${NOT_INVITED_PREFIX}: Reach out to your Pod Leader.`,
    )

    expect(getNotInvitedMessage(error)).toBe("Reach out to your Pod Leader.")
  })

  it("returns null for unrelated errors", () => {
    expect(getNotInvitedMessage(new Error("Something else"))).toBeNull()
  })
})
