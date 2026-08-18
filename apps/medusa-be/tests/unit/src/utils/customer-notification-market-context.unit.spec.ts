import { beforeEach, describe, expect, it, vi } from "vitest"

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { QUERY: "query" },
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
      NOT_FOUND: "not_found",
    }

    constructor(_type: string, message: string) {
      super(message)
    }
  },
}))

vi.mock("../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

const graph = vi.fn()
const container = {
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    throw new Error("Unexpected dependency")
  }),
}

describe("resolveCustomerNotificationMarketContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: "cz",
      locale: "cs-CZ",
      market_code: "cz",
      sales_channel_id: "sc_cz",
      storefront_base_url: "https://herbatica.cz",
      storefront_domain: "herbatica.cz",
    })
  })

  it("uses customer Sales Channel metadata without consulting order history", async () => {
    const { resolveCustomerNotificationMarketContext } = await import(
      "../../../../src/utils/customer-notification-market-context"
    )

    graph.mockResolvedValueOnce({
      data: [
        {
          addresses: [{ country_code: "sk" }],
          id: "cus_1",
          metadata: {
            storefront_market_code: "cz",
            storefront_sales_channel_id: "sc_cz",
          },
        },
      ],
    })

    await resolveCustomerNotificationMarketContext(container as never, {
      email: "customer@example.test",
    })

    expect(graph).toHaveBeenCalledTimes(1)
    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode: "cz",
      salesChannelId: "sc_cz",
    })
  })

  it("uses the latest customer order when metadata has no Sales Channel", async () => {
    const { resolveCustomerNotificationMarketContext } = await import(
      "../../../../src/utils/customer-notification-market-context"
    )

    graph
      .mockResolvedValueOnce({
        data: [
          { addresses: [{ country_code: "sk" }], id: "cus_1", metadata: {} },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            sales_channel_id: "sc_ro",
            shipping_address: { country_code: "ro" },
          },
        ],
      })

    await resolveCustomerNotificationMarketContext(container as never, {
      customerId: " cus_1 ",
      email: " customer@example.test ",
    })

    expect(graph).toHaveBeenNthCalledWith(2, {
      entity: "order",
      fields: [
        "sales_channel_id",
        "billing_address.country_code",
        "shipping_address.country_code",
      ],
      filters: { customer_id: "cus_1" },
      pagination: { order: { created_at: "DESC" }, take: 1 },
    })
    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode: "ro",
      salesChannelId: "sc_ro",
    })
  })

  it("fails before querying when no customer identity is provided", async () => {
    const { resolveCustomerNotificationMarketContext } = await import(
      "../../../../src/utils/customer-notification-market-context"
    )

    await expect(
      resolveCustomerNotificationMarketContext(container as never, {
        email: " ",
      })
    ).rejects.toThrow(
      "Customer ID or email is required to resolve the notification market."
    )
    expect(graph).not.toHaveBeenCalled()
  })
})
