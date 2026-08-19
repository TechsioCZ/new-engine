import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => {
  class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  return {
    StepResponse,
    WorkflowResponse,
    steps: new Map<string, (...args: unknown[]) => unknown>(),
  }
})

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => {
  class MedusaError extends Error {
    static Types = {
      NOT_FOUND: "not_found",
    }

    type: string

    constructor(type: string, message: string) {
      super(message)
      this.type = type
    }
  }

  return {
    ContainerRegistrationKeys: {
      LOGGER: "logger",
      QUERY: "query",
    },
    MedusaError,
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  WorkflowResponse: workflowSdkMock.WorkflowResponse,
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
  createWorkflow: vi.fn((_name: string, handler: unknown) => handler),
}))

vi.mock("../../modules/order-receipt", () => ({
  ORDER_RECEIPT_MODULE: "order_receipt",
}))

vi.mock("../steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))

vi.mock("../../utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

type Notification = {
  data?: Record<string, unknown>
}

type OrderTotalFixture = {
  currency_code?: string
  payment_collections?: Array<{
    payments?: Array<{ data?: Record<string, unknown> }>
  }>
  sales_channel_id?: string
  shipping_address?: { country_code?: string }
  summary: {
    current_order_total?: number | string | null
    original_order_total?: number | string | null
  } | null
  total: number | string | null
}

function createPaymentReminderNotificationContext(order: OrderTotalFixture) {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        currency_code: "czk",
        customer_id: "cus_123",
        display_id: 1001,
        email: "customer@example.com",
        id: "order_123",
        payment_collections: [
          {
            payments: [
              {
                data: {
                  payment_url: "https://payments.example.test/retry/123",
                },
              },
            ],
          },
        ],
        sales_channel_id: "sc_cz",
        shipping_address: { country_code: "cz" },
        ...order,
      },
    ],
  })
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

      if (key === "order_receipt") {
        return { generateOrderReceiptAttachment }
      }

      throw new Error(`Unexpected dependency ${key}`)
    }),
  }

  return { container, generateOrderReceiptAttachment, graph }
}

describe("send order payment reminder workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: "cz",
      locale: "cs-CZ",
      market_code: "cz",
      sales_channel_id: "sc_cz",
      store_name: "Herbatica",
      storefront_base_url: "https://herbatica.cz",
      storefront_domain: "herbatica.cz",
    })
  })

  it("uses the fetched order summary total for notification data", async () => {
    await import("../send-order-payment-reminder")

    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )

    expect(step).toBeDefined()

    const { container, graph } = createPaymentReminderNotificationContext({
      summary: {
        current_order_total: 1234.56,
        original_order_total: 1999,
      },
      total: 1999,
    })

    const result = (await step?.({ order_id: "order_123" }, { container })) as {
      output: Notification[]
    }

    expect(result.output[0]?.data?.total).toBe(
      new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1234.56)
    )
    expect(result.output[0]?.data?.total).not.toBe("stale input total")
    expect(result.output[0]?.data?.total).not.toBe(1999)
    expect(result.output[0]?.data?.payment_url).toBe(
      "https://payments.example.test/retry/123"
    )
    expect(result.output[0]).toMatchObject({
      receiver_id: "cus_123",
      resource_id: "order_123",
      to: "customer@example.com",
    })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        fields: expect.arrayContaining(["summary.*", "total", "currency_code"]),
        filters: { id: "order_123" },
      })
    )
  })

  it("prefers the stored HTTPS provider payment URL", async () => {
    await import("../send-order-payment-reminder")

    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )
    const { container } = createPaymentReminderNotificationContext({
      payment_collections: [
        {
          payments: [
            {
              data: {
                payment_url: "https://payments.example.test/retry/123",
              },
            },
          ],
        },
      ],
      summary: { current_order_total: 100 },
      total: 100,
    })

    const result = (await step?.({ order_id: "order_123" }, { container })) as {
      output: Notification[]
    }

    expect(result.output[0]?.data?.payment_url).toBe(
      "https://payments.example.test/retry/123"
    )
  })

  it.each([
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
  ])("formats the $countryCode reminder for its canonical market", async ({
    countryCode,
    currencyCode,
    domain,
    locale,
  }) => {
    await import("../send-order-payment-reminder")
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: countryCode,
      locale,
      market_code: countryCode,
      sales_channel_id: `sc_${countryCode}`,
      store_name: "Herbatica",
      storefront_base_url: `https://${domain}`,
      storefront_domain: domain,
    })

    const { container } = createPaymentReminderNotificationContext({
      currency_code: currencyCode,
      sales_channel_id: `sc_${countryCode}`,
      shipping_address: { country_code: countryCode },
      summary: { current_order_total: 1234.5 },
      total: 9999,
    })
    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )
    const result = (await step?.({ order_id: "order_123" }, { container })) as {
      output: Notification[]
    }

    expect(result.output[0]?.data).toMatchObject({
      locale,
      payment_url: "https://payments.example.test/retry/123",
      storefront_base_url: `https://${domain}`,
      total: new Intl.NumberFormat(locale, {
        currency: currencyCode.toUpperCase(),
        style: "currency",
      }).format(1234.5),
    })
  })

  it.each([
    {
      expectedTotal: new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1500),
      order: {
        summary: {
          current_order_total: null,
          original_order_total: 1500,
        },
        total: 1999,
      },
    },
    {
      expectedTotal: new Intl.NumberFormat("cs-CZ", {
        currency: "CZK",
        style: "currency",
      }).format(1600.5),
      order: {
        summary: {
          current_order_total: null,
          original_order_total: null,
        },
        total: "1600.5",
      },
    },
    {
      expectedTotal: undefined,
      order: {
        summary: null,
        total: null,
      },
    },
  ])("uses fetched order total precedence before input fallback %#", async ({
    expectedTotal,
    order,
  }) => {
    await import("../send-order-payment-reminder")

    const step = workflowSdkMock.steps.get(
      "build-order-payment-reminder-notification"
    )
    expect(step).toBeDefined()

    const { container } = createPaymentReminderNotificationContext(order)

    const result = (await step?.({ order_id: "order_123" }, { container })) as {
      output: Notification[]
    }

    expect(result.output[0]?.data?.total).toBe(expectedTotal)
  })
})
