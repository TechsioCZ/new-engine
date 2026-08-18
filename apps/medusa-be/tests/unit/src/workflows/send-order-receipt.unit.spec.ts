import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => ({
  steps: new Map<string, (...arguments_: unknown[]) => unknown>(),
}))
const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { LOGGER: "logger", QUERY: "query" },
  MedusaError: class MedusaError extends Error {
    static Types = { NOT_FOUND: "not_found" }
  },
  Modules: { NOTIFICATION: "notification" },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn(
    (name: string, handler: (...arguments_: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)

      return handler
    }
  ),
  createWorkflow: vi.fn((_name: string, handler: unknown) => handler),
  StepResponse: class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
  WorkflowResponse: class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
}))

vi.mock("../../../../src/modules/order-receipt", () => ({
  ORDER_RECEIPT_MODULE: "order_receipt",
}))

vi.mock("../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

const MARKETS = [
  {
    countryCode: "sk",
    currencyCode: "eur",
    domain: "herbatica.sk",
    locale: "sk-SK",
  },
  {
    countryCode: "cz",
    currencyCode: "czk",
    domain: "herbatica.cz",
    locale: "cs-CZ",
  },
  {
    countryCode: "hu",
    currencyCode: "huf",
    domain: "herbatica.hu",
    locale: "hu-HU",
  },
  {
    countryCode: "ro",
    currencyCode: "ron",
    domain: "herbatica.ro",
    locale: "ro-RO",
  },
] as const

describe("send order receipt workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(
    MARKETS
  )("uses authoritative order data and $locale notification formatting", async ({
    countryCode,
    currencyCode,
    domain,
    locale,
  }) => {
    await import("../../../../src/workflows/send-order-receipt")
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: countryCode,
      locale,
      market_code: countryCode,
      sales_channel_id: ["sc_", countryCode].join(""),
      store_name: "Herbatica",
      storefront_base_url: ["https://", domain].join(""),
      storefront_domain: domain,
    })

    const order = {
      currency_code: currencyCode,
      customer: { first_name: "Fetched", last_name: "Customer" },
      customer_id: "cus_1",
      display_id: 42,
      email: "fetched@example.test",
      id: "order_1",
      sales_channel_id: ["sc_", countryCode].join(""),
      shipping_address: { country_code: countryCode },
      summary: { current_order_total: 1234.5 },
      total: 9999,
    }
    const graph = vi.fn().mockResolvedValue({ data: [order] })
    const createNotifications = vi
      .fn()
      .mockResolvedValue([{ id: "notification_1" }])
    const generateOrderReceiptAttachment = vi.fn().mockResolvedValue({
      content: Buffer.from("pdf"),
      content_type: "application/pdf",
      filename: "receipt.pdf",
    })
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === "query") {
          return { graph }
        }

        if (key === "logger") {
          return { warn: vi.fn() }
        }

        if (key === "notification") {
          return { createNotifications }
        }

        if (key === "order_receipt") {
          return { generateOrderReceiptAttachment }
        }

        throw new Error("Unexpected dependency")
      }),
    }
    const step = workflowSdkMock.steps.get("send-order-receipt")

    await step?.({ order_id: "order_1" }, { container })

    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer_name: "Fetched Customer",
          locale,
          storefront_base_url: ["https://", domain].join(""),
          total: new Intl.NumberFormat(locale, {
            currency: currencyCode.toUpperCase(),
            style: "currency",
          }).format(1234.5),
        }),
        resource_id: "order_1",
        to: "fetched@example.test",
      })
    )
    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode,
      salesChannelId: ["sc_", countryCode].join(""),
    })
    expect(generateOrderReceiptAttachment).toHaveBeenCalledWith(order, {
      locale,
      storeName: "Herbatica",
    })
  })
})
