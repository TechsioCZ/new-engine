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

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomInt: vi.fn(() => 123_456),
  randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000000"),
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
}))

vi.mock("../../../../utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

vi.mock("../../../../modules/claim-case", () => ({
  CLAIM_CASE_MODULE: "claim_case",
}))

type Notification = {
  data?: Record<string, unknown>
}

function createContext(countryCode = "cz", salesChannelId = "sc_cz") {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        billing_address: null,
        display_id: 1001,
        email: "customer@example.test",
        id: "order_123",
        sales_channel_id: salesChannelId,
        shipping_address: { country_code: countryCode },
      },
    ],
  })
  const createClaimAccesses = vi.fn().mockResolvedValue({ id: "access_123" })
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === "query") {
        return { graph }
      }
      if (key === "claim_case") {
        return { createClaimAccesses }
      }
      throw new Error(`Unexpected dependency ${key}`)
    }),
  }

  return { container, createClaimAccesses, graph }
}

describe("request claim access step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveNotificationMarketContext.mockReset()
  })

  it.each([
    ["sk", "sk-SK", "herbatica.sk"],
    ["cz", "cs-CZ", "herbatica.cz"],
    ["hu", "hu-HU", "herbatica.hu"],
    ["ro", "ro-RO", "herbatica.ro"],
  ])("adds the canonical %s market context to the access email", async (marketCode, locale, domain) => {
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: marketCode,
      locale,
      market_code: marketCode,
      sales_channel_id: `sc_${marketCode}`,
      store_name: "Herbatica",
      storefront_base_url: `https://${domain}`,
      storefront_domain: domain,
    })
    await import("../request-claim-access")
    const step = workflowSdkMock.steps.get("request-claim-access")
    const { container, createClaimAccesses, graph } = createContext(
      marketCode,
      `sc_${marketCode}`
    )

    expect(step).toBeDefined()

    const result = (await step?.(
      {
        email: "customer@example.test",
        order_number: "1001",
        sales_channel_id: `sc_${marketCode}`,
      },
      { container }
    )) as { output: { notification_input: Notification[] } }

    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode: marketCode,
      salesChannelId: `sc_${marketCode}`,
    })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining([
          "sales_channel_id",
          "shipping_address.country_code",
          "billing_address.country_code",
        ]),
        filters: {
          display_id: "1001",
          sales_channel_id: `sc_${marketCode}`,
        },
      })
    )
    expect(createClaimAccesses).toHaveBeenCalledWith(
      expect.objectContaining({ sales_channel_id: `sc_${marketCode}` })
    )
    expect(result.output.notification_input[0]).toMatchObject({
      data: {
        locale,
        market_code: marketCode,
        storefront_base_url: `https://${domain}`,
        order_display_id: "1001",
        verification_code: "123456",
      },
      template: "claim-access-code",
    })
  })

  it("fails before creating an access challenge when the market is ambiguous", async () => {
    resolveNotificationMarketContext.mockRejectedValue(
      new Error("Notification market cannot be resolved unambiguously")
    )
    await import("../request-claim-access")
    const step = workflowSdkMock.steps.get("request-claim-access")
    const { container, createClaimAccesses } = createContext()

    await expect(
      step?.(
        {
          email: "customer@example.test",
          order_number: "1001",
          sales_channel_id: "sc_cz",
        },
        { container }
      )
    ).rejects.toThrow("cannot be resolved unambiguously")
    expect(createClaimAccesses).not.toHaveBeenCalled()
  })

  it("does not create a challenge when the order belongs to another Sales Channel", async () => {
    await import("../request-claim-access")
    const step = workflowSdkMock.steps.get("request-claim-access")
    const { container, createClaimAccesses } = createContext("hu", "sc_hu")

    const result = (await step?.(
      {
        email: "customer@example.test",
        order_number: "1001",
        sales_channel_id: "sc_cz",
      },
      { container }
    )) as { output: { notification_input: Notification[] } }

    expect(createClaimAccesses).not.toHaveBeenCalled()
    expect(resolveNotificationMarketContext).not.toHaveBeenCalled()
    expect(result.output.notification_input).toEqual([])
    expect(result.output.result).toMatchObject({ accepted: true })
  })
})
