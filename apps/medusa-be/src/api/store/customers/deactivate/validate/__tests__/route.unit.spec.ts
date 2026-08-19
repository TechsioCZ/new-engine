import { afterEach, describe, expect, it, vi } from "vitest"

const verifyToken = vi.hoisted(() => vi.fn())

vi.mock("../../../../../../utils/customer-account-deactivation", () => ({
  verifyCustomerAccountDeactivationToken: verifyToken,
}))

import { POST } from "../route"

const previousJwtSecret = process.env.JWT_SECRET

afterEach(() => {
  verifyToken.mockReset()
  if (previousJwtSecret === undefined) {
    Reflect.deleteProperty(process.env, "JWT_SECRET")
  } else {
    process.env.JWT_SECRET = previousJwtSecret
  }
})

const response = () => ({ json: vi.fn(), setHeader: vi.fn() })

describe("POST /store/customers/deactivate/validate", () => {
  it("accepts an exact, usable token bound to the request market", async () => {
    process.env.JWT_SECRET = "deactivation-test-secret"
    verifyToken.mockResolvedValue({
      customer_id: "cus_1",
      sales_channel_id: "sc_cz",
    })
    const result = response()

    await POST(
      {
        body: { token: "ExactToken" },
        publishable_key_context: { sales_channel_ids: ["sc_cz"] },
      } as never,
      result as never
    )

    expect(verifyToken).toHaveBeenCalledWith("ExactToken")
    expect(result.json).toHaveBeenCalledWith({ valid: true })
    expect(result.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    )
  })

  it("collapses market mismatch and invalid token to not found", async () => {
    process.env.JWT_SECRET = "deactivation-test-secret"
    verifyToken.mockResolvedValue({
      customer_id: "cus_1",
      sales_channel_id: "sc_sk",
    })

    await expect(
      POST(
        {
          body: { token: "ExactToken" },
          publishable_key_context: { sales_channel_ids: ["sc_cz"] },
        } as never,
        response() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })

    verifyToken.mockRejectedValue(new Error("expired"))
    await expect(
      POST(
        {
          body: { token: "ExactToken" },
          publishable_key_context: { sales_channel_ids: ["sc_cz"] },
        } as never,
        response() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })
  })

  it("keeps missing server configuration as a backend fault", async () => {
    Reflect.deleteProperty(process.env, "JWT_SECRET")

    await expect(
      POST(
        {
          body: { token: "ExactToken" },
          publishable_key_context: { sales_channel_ids: ["sc_cz"] },
        } as never,
        response() as never
      )
    ).rejects.toMatchObject({ type: "invalid_data" })
    expect(verifyToken).not.toHaveBeenCalled()
  })
})
