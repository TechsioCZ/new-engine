import { beforeEach, describe, expect, it, vi } from "vitest"

const workflows = vi.hoisted(() => {
  const deactivateRun = vi.fn()
  const verifyRun = vi.fn()

  return {
    deactivate: vi.fn(() => ({ run: deactivateRun })),
    deactivateRun,
    verify: vi.fn(() => ({ run: verifyRun })),
    verifyRun,
  }
})

vi.mock(
  "../../../../../../workflows/customer/workflows/deactivate-customer-account",
  () => ({
    deactivateCustomerAccountWorkflow: workflows.deactivate,
  })
)

vi.mock(
  "../../../../../../workflows/customer/workflows/verify-customer-account-deactivation",
  () => ({
    verifyCustomerAccountDeactivationWorkflow: workflows.verify,
  })
)

import { POST } from "../route"

const response = () => {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  const setHeader = vi.fn()

  return { json, setHeader, status }
}

const request = (salesChannelIds: unknown) => ({
  publishable_key_context: { sales_channel_ids: salesChannelIds },
  scope: { resolve: vi.fn() },
  validatedBody: { token: "ExactToken" },
})

describe("POST /store/customers/deactivate/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workflows.verifyRun.mockResolvedValue({
      result: { customer_id: "cus_1", sales_channel_id: "sc_ro" },
    })
    workflows.deactivateRun.mockResolvedValue({
      result: {
        auth_identity_deleted: true,
        customer_id: "cus_1",
        deleted: true,
      },
    })
  })

  it("deactivates a globally shared customer only in the token-bound current market", async () => {
    const req = request(["sc_ro"])
    const res = response()

    await POST(req as never, res as never)

    expect(workflows.verify).toHaveBeenCalledWith(req.scope)
    expect(workflows.verifyRun).toHaveBeenCalledWith({
      input: { token: "ExactToken" },
    })
    expect(workflows.deactivate).toHaveBeenCalledWith(req.scope)
    expect(workflows.deactivateRun).toHaveBeenCalledWith({
      input: { customer_id: "cus_1" },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      auth_identity_deleted: true,
      customer_id: "cus_1",
      deleted: true,
    })
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      "Cache-Control",
      "private, no-store"
    )
    expect(res.setHeader).toHaveBeenNthCalledWith(2, "Pragma", "no-cache")
  })

  it("rejects cross-market token replay before account mutation", async () => {
    const res = response()

    await expect(
      POST(request(["sc_cz"]) as never, res as never)
    ).rejects.toThrow("Resource was not found.")

    expect(workflows.verifyRun).toHaveBeenCalledOnce()
    expect(workflows.deactivate).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      "Cache-Control",
      "private, no-store"
    )
    expect(res.setHeader).toHaveBeenNthCalledWith(2, "Pragma", "no-cache")
  })

  it.each([
    undefined,
    [],
    ["sc_ro", "sc_cz"],
    [null, ""],
  ])("rejects missing or ambiguous current market scope: %o", async (salesChannelIds) => {
    const res = response()

    await expect(
      POST(request(salesChannelIds) as never, res as never)
    ).rejects.toThrow("Resource was not found.")

    expect(workflows.verify).not.toHaveBeenCalled()
    expect(workflows.deactivate).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      "Cache-Control",
      "private, no-store"
    )
    expect(res.setHeader).toHaveBeenNthCalledWith(2, "Pragma", "no-cache")
  })
})
