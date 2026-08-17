import { describe, expect, it } from "vitest"
import {
  StoreCreateClaimSchema,
  StoreVerifyClaimAccessSchema,
} from "../../../src/api/store/claims/validators"

describe("claim storefront validators", () => {
  it("accepts a minimal verified return request", () => {
    const result = StoreCreateClaimSchema.safeParse({
      access_token: "a".repeat(32),
      email: "customer@example.com",
      items: [{ order_item_id: "orditem_123", quantity: 1 }],
      type: "return",
    })

    expect(result.success).toBe(true)
  })

  it("accepts the manual fallback with purchase and item details", () => {
    const result = StoreCreateClaimSchema.safeParse({
      defect_description: "The package arrived damaged.",
      email: "customer@example.com",
      items: [{ quantity: 1, title: "Herbal tea" }],
      purchase_details: "Purchased in the Bratislava store on 2026-08-01.",
      requested_resolution: "replacement",
      type: "complaint",
    })

    expect(result.success).toBe(true)
  })

  it("requires complaint details and a requested resolution", () => {
    const result = StoreCreateClaimSchema.safeParse({
      access_token: "a".repeat(32),
      email: "customer@example.com",
      items: [{ order_item_id: "orditem_123", quantity: 1 }],
      type: "complaint",
    })

    expect(result.success).toBe(false)
  })

  it("does not allow free-form items with verified order access", () => {
    const result = StoreCreateClaimSchema.safeParse({
      access_token: "a".repeat(32),
      email: "customer@example.com",
      items: [{ quantity: 1, title: "Unverified item" }],
      type: "return",
    })

    expect(result.success).toBe(false)
  })

  it("requires a six-digit verification code", () => {
    expect(
      StoreVerifyClaimAccessSchema.safeParse({
        challenge_id: "claimaccess_123",
        code: "123456",
      }).success
    ).toBe(true)
    expect(
      StoreVerifyClaimAccessSchema.safeParse({
        challenge_id: "claimaccess_123",
        code: "12345",
      }).success
    ).toBe(false)
  })
})
