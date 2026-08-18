import { describe, expect, it } from "vitest"
import { didNotificationDeliverySucceed } from "../../../../src/utils/notification-delivery-status"

describe("didNotificationDeliverySucceed", () => {
  it("accepts a successful local-provider notification without an external id", () => {
    expect(didNotificationDeliverySucceed({ status: "success" })).toBe(true)
  })

  it("rejects pending and failed notifications even when an external id exists", () => {
    expect(
      didNotificationDeliverySucceed({
        external_id: "external_1",
        status: "pending",
      })
    ).toBe(false)
    expect(
      didNotificationDeliverySucceed({
        external_id: "external_1",
        status: "failure",
      })
    ).toBe(false)
  })

  it("requires every returned notification to succeed", () => {
    expect(
      didNotificationDeliverySucceed([
        { status: "success" },
        { status: "success" },
      ])
    ).toBe(true)
    expect(
      didNotificationDeliverySucceed([
        { status: "success" },
        { status: "failure" },
      ])
    ).toBe(false)
    expect(didNotificationDeliverySucceed([])).toBe(false)
    expect(didNotificationDeliverySucceed(undefined)).toBe(false)
  })
})
