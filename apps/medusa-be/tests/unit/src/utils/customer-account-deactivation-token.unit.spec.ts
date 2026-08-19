import { generateJwtToken } from "@medusajs/framework/utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE,
  createCustomerAccountDeactivationToken,
  verifyCustomerAccountDeactivationToken,
} from "../../../../src/utils/customer-account-deactivation"

describe("customer account deactivation token", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-jwt-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("round-trips the exact Sales Channel binding", async () => {
    const token = createCustomerAccountDeactivationToken({
      customer_id: "cus_1",
      email: "customer@example.test",
      sales_channel_id: "sc_SK_exact_Case",
    })

    await expect(
      verifyCustomerAccountDeactivationToken(token)
    ).resolves.toEqual({
      customer_id: "cus_1",
      email: "customer@example.test",
      sales_channel_id: "sc_SK_exact_Case",
    })
  })

  it("rejects a legacy token without a Sales Channel binding", async () => {
    const token = generateJwtToken(
      {
        customer_id: "cus_1",
        purpose: CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE,
      },
      { expiresIn: "30m", secret: "test-jwt-secret" }
    )

    await expect(verifyCustomerAccountDeactivationToken(token)).rejects.toThrow(
      "Account deactivation link is invalid or expired."
    )
  })
})
