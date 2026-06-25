import { describe, expect, it } from "vitest"
import { getNotificationDeliveryStatus } from "../convex/lib/notificationDeliveryStatus"

describe("getNotificationDeliveryStatus", () => {
  it("treats skipped-only delivery as sent", () => {
    expect(
      getNotificationDeliveryStatus({
        pending: 0,
        sent: 0,
        failed: 0,
        skipped: 3,
      }),
    ).toBe("sent")
  })

  it("keeps fully pending delivery pending", () => {
    expect(
      getNotificationDeliveryStatus({
        pending: 2,
        sent: 0,
        failed: 0,
        skipped: 0,
      }),
    ).toBe("pending")
  })

  it("marks mixed outcomes as partial", () => {
    expect(
      getNotificationDeliveryStatus({
        pending: 0,
        sent: 1,
        failed: 1,
        skipped: 1,
      }),
    ).toBe("partial")
  })

  it("marks all failed delivery as failed", () => {
    expect(
      getNotificationDeliveryStatus({
        pending: 0,
        sent: 0,
        failed: 2,
        skipped: 0,
      }),
    ).toBe("failed")
  })

  it("marks notifications with no recipients as failed", () => {
    expect(
      getNotificationDeliveryStatus({
        pending: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      }),
    ).toBe("failed")
  })
})
