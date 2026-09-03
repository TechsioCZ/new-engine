import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => {
  class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  return {
    StepResponse,
    steps: new Map<string, (...args: unknown[]) => unknown>(),
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
}))

vi.mock("../../../../modules/claim-case", () => ({
  CLAIM_CASE_MODULE: "claim_case",
}))

function createContext(accessSalesChannelId = "sc_cz") {
  const updateClaimAccesses = vi.fn()
  const service = {
    retrieveClaimAccess: vi.fn().mockResolvedValue({
      attempts: 0,
      code_hash:
        "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
      email: "customer@example.test",
      expires_at: new Date(Date.now() + 60_000),
      id: "access_123",
      order_id: "order_123",
      sales_channel_id: accessSalesChannelId,
      used_at: null,
      verified_at: null,
    }),
    updateClaimAccesses,
  }
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        display_id: 1001,
        id: "order_123",
        items: [],
        sales_channel_id: accessSalesChannelId,
      },
    ],
  })
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === "claim_case") {
        return service
      }
      if (key === "query") {
        return { graph }
      }
      throw new Error(`Unexpected dependency ${key}`)
    }),
  }

  return { container, graph, service, updateClaimAccesses }
}

describe("verify claim access step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("verifies a challenge only in its bound Sales Channel", async () => {
    await import("../verify-claim-access")
    const step = workflowSdkMock.steps.get("verify-claim-access")
    const { container, graph, updateClaimAccesses } = createContext()

    const result = (await step?.(
      {
        challenge_id: "access_123",
        code: "123456",
        sales_channel_id: "sc_cz",
      },
      { container }
    )) as { output: { access_token: string } }

    expect(result.output.access_token).toEqual(expect.any(String))
    expect(updateClaimAccesses).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "access_123",
        verified_at: expect.any(Date),
      })
    )
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining(["sales_channel_id"]),
        filters: { id: "order_123", sales_channel_id: "sc_cz" },
      })
    )
  })

  it("rejects cross-market challenge replay before any mutation", async () => {
    await import("../verify-claim-access")
    const step = workflowSdkMock.steps.get("verify-claim-access")
    const { container, graph, updateClaimAccesses } = createContext("sc_hu")

    await expect(
      step?.(
        {
          challenge_id: "access_123",
          code: "123456",
          sales_channel_id: "sc_cz",
        },
        { container }
      )
    ).rejects.toThrow("invalid or expired")
    expect(updateClaimAccesses).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
  })
})
