import { beforeEach, describe, expect, it, vi } from "vitest"
import { storeClaimRoutesMiddlewares } from "../../../../../../src/api/store/claims/middlewares"
import { POST as requestClaimAccess } from "../../../../../../src/api/store/claims/order-access/request/route"
import { POST as verifyClaimAccess } from "../../../../../../src/api/store/claims/order-access/verify/route"
import { POST as createClaim } from "../../../../../../src/api/store/claims/route"
import { enforceExactStorefrontMarketSalesChannel } from "../../../../../../src/api/store/storefront-market-sales-channel"

const workflows = vi.hoisted(() => ({
  createClaimRun: vi
    .fn()
    .mockResolvedValue({ result: { case_number: "RMA-1" } }),
  requestAccessRun: vi
    .fn()
    .mockResolvedValue({
      result: { accepted: true, challenge_id: "access_1" },
    }),
  verifyAccessRun: vi
    .fn()
    .mockResolvedValue({ result: { access_token: "token_1", order: {} } }),
}))

vi.mock(
  "../../../../../../src/workflows/claim-case/workflows/create-claim",
  () => ({
    createClaimWorkflow: vi.fn(() => ({ run: workflows.createClaimRun })),
  })
)

vi.mock(
  "../../../../../../src/workflows/claim-case/workflows/request-claim-access",
  () => ({
    requestClaimAccessWorkflow: vi.fn(() => ({
      run: workflows.requestAccessRun,
    })),
  })
)

vi.mock(
  "../../../../../../src/workflows/claim-case/workflows/verify-claim-access",
  () => ({
    verifyClaimAccessWorkflow: vi.fn(() => ({
      run: workflows.verifyAccessRun,
    })),
  })
)

const createRequest = (body: Record<string, unknown>) => ({
  publishable_key_context: { sales_channel_ids: ["sc_cz"] },
  scope: {},
  validatedBody: body,
})

const createResponse = () => {
  const json = vi.fn()
  return {
    json,
    status: vi.fn(() => ({ json })),
  }
}

describe("claim Store routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    [
      "request",
      requestClaimAccess,
      workflows.requestAccessRun,
      { email: "customer@example.test", order_number: "1001" },
    ],
    [
      "verify",
      verifyClaimAccess,
      workflows.verifyAccessRun,
      { challenge_id: "access_1", code: "123456" },
    ],
    [
      "create",
      createClaim,
      workflows.createClaimRun,
      {
        email: "customer@example.test",
        items: [{ quantity: 1, title: "Tea" }],
        type: "return",
      },
    ],
  ])("binds the %s workflow input to the exact publishable-key channel", async (_name, handler, run, body) => {
    await handler(createRequest(body) as never, createResponse() as never)

    expect(run).toHaveBeenCalledWith({
      input: { ...body, sales_channel_id: "sc_cz" },
    })
  })

  it("rejects an ambiguous key scope before invoking a workflow", async () => {
    const req = {
      ...createRequest({ challenge_id: "access_1", code: "123456" }),
      publishable_key_context: { sales_channel_ids: ["sc_cz", "sc_hu"] },
    }

    await expect(
      verifyClaimAccess(req as never, createResponse() as never)
    ).rejects.toThrow("Resource was not found")
    expect(workflows.verifyAccessRun).not.toHaveBeenCalled()
  })

  it("runs the exact market guard before all claim handlers", () => {
    expect(storeClaimRoutesMiddlewares).toHaveLength(3)
    for (const route of storeClaimRoutesMiddlewares) {
      expect(route.middlewares[0]).toBe(
        enforceExactStorefrontMarketSalesChannel
      )
    }
  })
})
