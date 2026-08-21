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

  return { json, status }
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
  })

  it("rejects cross-market token replay before account mutation", async () => {
    await expect(
      POST(request(["sc_cz"]) as never, response() as never)
    ).rejects.toThrow("Resource was not found.")

    expect(workflows.verifyRun).toHaveBeenCalledOnce()
    expect(workflows.deactivate).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    [],
    ["sc_ro", "sc_cz"],
    [null, ""],
  ])("rejects missing or ambiguous current market scope: %o", async (salesChannelIds) => {
    await expect(
      POST(request(salesChannelIds) as never, response() as never)
    ).rejects.toThrow("Resource was not found.")

    expect(workflows.verify).not.toHaveBeenCalled()
    expect(workflows.deactivate).not.toHaveBeenCalled()
  })
})
