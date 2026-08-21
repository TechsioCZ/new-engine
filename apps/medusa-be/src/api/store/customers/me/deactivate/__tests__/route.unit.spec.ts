import { beforeEach, describe, expect, it, vi } from "vitest"

const workflow = vi.hoisted(() => {
  const run = vi.fn()
  const request = vi.fn(() => ({ run }))

  return { request, run }
})

vi.mock(
  "../../../../../../workflows/customer/workflows/request-customer-account-deactivation",
  () => ({
    requestCustomerAccountDeactivationWorkflow: workflow.request,
  })
)

import { POST } from "../route"

const response = () => {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))

  return { json, status }
}

describe("POST /store/customers/me/deactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workflow.run.mockResolvedValue({
      result: { customer_id: "cus_1", sent: true },
    })
  })

  it("passes the authenticated customer and exact publishable-key market scope", async () => {
    const result = response()
    const scope = { resolve: vi.fn() }

    await POST(
      {
        auth_context: { actor_id: "cus_1" },
        publishable_key_context: { sales_channel_ids: ["sc_hu"] },
        scope,
      } as never,
      result as never
    )

    expect(workflow.request).toHaveBeenCalledWith(scope)
    expect(workflow.run).toHaveBeenCalledWith({
      input: {
        customer_id: "cus_1",
        sales_channel_id: "sc_hu",
      },
    })
    expect(result.status).toHaveBeenCalledWith(200)
    expect(result.json).toHaveBeenCalledWith({
      customer_id: "cus_1",
      sent: true,
    })
  })

  it.each([
    undefined,
    [],
    ["sc_cz", "sc_hu"],
    [null, ""],
  ])("rejects missing or ambiguous publishable-key scope: %o", async (salesChannelIds) => {
    await expect(
      POST(
        {
          auth_context: { actor_id: "cus_1" },
          publishable_key_context: { sales_channel_ids: salesChannelIds },
          scope: {},
        } as never,
        response() as never
      )
    ).rejects.toThrow("Resource was not found.")
    expect(workflow.request).not.toHaveBeenCalled()
  })
})
