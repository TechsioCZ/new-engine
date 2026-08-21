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

function createContext() {
  const createClaimCases = vi.fn().mockResolvedValue({ id: "claim_123" })
  const createClaimItems = vi.fn().mockResolvedValue([{ id: "item_123" }])
  const service = {
    createClaimCases,
    createClaimItems,
  }
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === "claim_case") {
        return service
      }
      throw new Error(`Unexpected dependency ${key}`)
    }),
  }

  return { container, createClaimCases, service }
}

describe("create claim step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveNotificationMarketContext.mockReset()
  })

  it.each([
    ["sk", "sk-SK", "herbatica.sk"],
    ["cz", "cs-CZ", "herbatica.cz"],
    ["hu", "hu-HU", "herbatica.hu"],
    ["ro", "ro-RO", "herbatica.ro"],
  ])("adds the canonical %s market context to a manual claim confirmation", async (marketCode, locale, domain) => {
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: marketCode,
      locale,
      market_code: marketCode,
      sales_channel_id: `sc_${marketCode}`,
      store_name: "Herbatica",
      storefront_base_url: `https://${domain}`,
      storefront_domain: domain,
    })
    await import("../create-claim")
    const step = workflowSdkMock.steps.get("create-claim")
    const { container } = createContext()

    expect(step).toBeDefined()

    const result = (await step?.(
      {
        email: "customer@example.test",
        items: [{ quantity: 1, title: "Herbal tea" }],
        sales_channel_id: `sc_${marketCode}`,
        type: "complaint",
      },
      { container }
    )) as { output: { notification_input: Notification[] } }

    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      salesChannelId: `sc_${marketCode}`,
    })
    expect(result.output.notification_input[0]).toMatchObject({
      data: {
        locale,
        market_code: marketCode,
        storefront_base_url: `https://${domain}`,
        case_type: "complaint",
      },
      template: "claim-confirmation",
      to: "customer@example.test",
    })
  })

  it("fails before creating a claim when the customer market is ambiguous", async () => {
    resolveNotificationMarketContext.mockRejectedValue(
      new Error("Notification market cannot be resolved unambiguously")
    )
    await import("../create-claim")
    const step = workflowSdkMock.steps.get("create-claim")
    const { container, createClaimCases } = createContext()

    await expect(
      step?.(
        {
          email: "customer@example.test",
          items: [{ quantity: 1, title: "Herbal tea" }],
          sales_channel_id: "sc_cz",
          type: "return",
        },
        { container }
      )
    ).rejects.toThrow("cannot be resolved unambiguously")
    expect(createClaimCases).not.toHaveBeenCalled()
  })

  it("uses the verified order market for an order-backed claim", async () => {
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: "hu",
      locale: "hu-HU",
      market_code: "hu",
      sales_channel_id: "sc_hu",
      store_name: "Herbatica",
      storefront_base_url: "https://herbatica.hu",
      storefront_domain: "herbatica.hu",
    })
    await import("../create-claim")
    const step = workflowSdkMock.steps.get("create-claim")
    const createClaimCases = vi.fn().mockResolvedValue({ id: "claim_123" })
    const service = {
      createClaimCases,
      createClaimItems: vi.fn().mockResolvedValue([{ id: "item_123" }]),
      listClaimAccesses: vi.fn().mockResolvedValue([
        {
          email: "customer@example.test",
          expires_at: new Date(Date.now() + 60_000),
          id: "access_123",
          order_id: "order_123",
          sales_channel_id: "sc_hu",
          used_at: null,
          verified_at: new Date(),
        },
      ]),
      updateClaimAccesses: vi.fn(),
    }
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          billing_address: null,
          customer_id: "cus_123",
          display_id: 1001,
          email: "customer@example.test",
          id: "order_123",
          items: [
            {
              id: "item_123",
              product_id: "prod_123",
              quantity: 2,
              title: "Herbal tea",
              variant_id: "variant_123",
            },
          ],
          sales_channel_id: "sc_hu",
          shipping_address: { country_code: "hu" },
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

    const result = (await step?.(
      {
        access_token: "verified-token",
        email: "customer@example.test",
        items: [{ order_item_id: "item_123", quantity: 1 }],
        sales_channel_id: "sc_hu",
        type: "return",
      },
      { container }
    )) as { output: { notification_input: Notification[] } }

    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode: "hu",
      salesChannelId: "sc_hu",
    })
    expect(result.output.notification_input[0]).toMatchObject({
      data: {
        locale: "hu-HU",
        market_code: "hu",
        storefront_base_url: "https://herbatica.hu",
      },
      receiver_id: "cus_123",
    })
  })

  it("rejects cross-market access-token replay before reads or writes", async () => {
    await import("../create-claim")
    const step = workflowSdkMock.steps.get("create-claim")
    const createClaimCases = vi.fn()
    const listClaimAccesses = vi.fn().mockResolvedValue([
      {
        email: "customer@example.test",
        expires_at: new Date(Date.now() + 60_000),
        id: "access_hu",
        order_id: "order_hu",
        sales_channel_id: "sc_hu",
        used_at: null,
        verified_at: new Date(),
      },
    ])
    const graph = vi.fn()
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === "claim_case") {
          return { createClaimCases, listClaimAccesses }
        }
        if (key === "query") {
          return { graph }
        }
        throw new Error(`Unexpected dependency ${key}`)
      }),
    }

    await expect(
      step?.(
        {
          access_token: "verified-token",
          email: "customer@example.test",
          items: [{ order_item_id: "item_123", quantity: 1 }],
          sales_channel_id: "sc_cz",
          type: "return",
        },
        { container }
      )
    ).rejects.toThrow("invalid or expired")
    expect(graph).not.toHaveBeenCalled()
    expect(createClaimCases).not.toHaveBeenCalled()
  })
})
