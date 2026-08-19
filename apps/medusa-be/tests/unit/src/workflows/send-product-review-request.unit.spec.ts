import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => ({
  steps: new Map<string, (...arguments_: unknown[]) => unknown>(),
}))
const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())
const reviewUtilities = vi.hoisted(() => {
  const copy = {
    "cs-CZ": {
      action: "Napište recenzi produktu",
      message: "Podělte se o zkušenost s produktem",
      product: "Produkt",
    },
    "hu-HU": {
      action: "Írjon véleményt a termékről",
      message: "Ossza meg a termékkel kapcsolatos tapasztalatait",
      product: "Termék",
    },
    "ro-RO": {
      action: "Scrieți o recenzie pentru produs",
      message: "Împărtășiți experiența dumneavoastră cu produsul",
      product: "Produs",
    },
    "sk-SK": {
      action: "Napíšte recenziu produktu",
      message: "Podeľte sa o skúsenosť s produktom",
      product: "Produkt",
    },
  } as const

  return {
    buildProductReviewRequestUrl: vi.fn(({ productId, storefrontUrl, token }) =>
      [
        storefrontUrl.endsWith("/")
          ? storefrontUrl.slice(0, -1)
          : storefrontUrl,
        "/reviews/product/",
        encodeURIComponent(token),
        "?product_id=",
        encodeURIComponent(productId),
      ].join("")
    ),
    copy,
    getReviewRequestCopy: vi.fn((locale: keyof typeof copy) => copy[locale]),
    getReviewRequestMessage: vi.fn(
      async (_container: unknown, locale: keyof typeof copy) =>
        copy[locale].message
    ),
  }
})

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { LOGGER: "logger", QUERY: "query" },
  MedusaError: class MedusaError extends Error {
    static Types = { NOT_FOUND: "not_found" }
  },
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
  transform: vi.fn(),
  when: vi.fn(),
  WorkflowResponse: class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
}))

vi.mock("../../../../src/modules/email-log", () => ({
  EMAIL_LOG_MODULE: "email_log",
}))
vi.mock("../../../../src/modules/product-review", () => ({
  PRODUCT_REVIEW_MODULE: "product_review",
}))
vi.mock("../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))
vi.mock("../../../../src/utils/order-review-requests", () => reviewUtilities)
vi.mock("../../../../src/workflows/steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))
vi.mock(
  "../../../../src/workflows/workflow-queue/steps/delete-workflow-queue-item",
  () => ({ deleteWorkflowQueueItemStep: vi.fn() })
)

const MARKETS = [
  { countryCode: "sk", domain: "herbatica.sk", locale: "sk-SK" },
  { countryCode: "cz", domain: "herbatica.cz", locale: "cs-CZ" },
  { countryCode: "hu", domain: "herbatica.hu", locale: "hu-HU" },
  { countryCode: "ro", domain: "herbatica.ro", locale: "ro-RO" },
] as const

const createContext = (countryCode: string) => {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        customer_id: "cus_1",
        display_id: 42,
        email: "fetched@example.test",
        id: "order_1",
        items: [{ product_id: "prod_1" }],
        sales_channel_id: ["sc_", countryCode].join(""),
        shipping_address: { country_code: countryCode },
      },
    ],
  })
  const listEmailLogs = vi.fn().mockResolvedValue([])
  const listReviewTokens = vi.fn().mockResolvedValue([
    {
      email: "fetched@example.test",
      id: "review_token_1",
      order_id: "order_1",
      product_id: "prod_1",
      token: "token/value",
    },
  ])
  const createReviewTokens = vi.fn()
  const logger = { info: vi.fn(), warn: vi.fn() }
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === "query") {
        return { graph }
      }

      if (key === "logger") {
        return logger
      }

      if (key === "email_log") {
        return { listEmailLogs }
      }

      if (key === "product_review") {
        return { createReviewTokens, listReviewTokens }
      }

      throw new Error("Unexpected dependency")
    }),
  }

  return {
    container,
    createReviewTokens,
    graph,
    listEmailLogs,
    listReviewTokens,
  }
}

describe("send product review request workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(
    MARKETS
  )("uses the $locale market URL and copy from the fetched order", async ({
    countryCode,
    domain,
    locale,
  }) => {
    await import("../../../../src/workflows/send-product-review-request")
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: countryCode,
      locale,
      market_code: countryCode,
      sales_channel_id: ["sc_", countryCode].join(""),
      storefront_base_url: ["https://", domain].join(""),
      storefront_domain: domain,
    })

    const { container, createReviewTokens } = createContext(countryCode)
    const step = workflowSdkMock.steps.get(
      "build-product-review-request-notification"
    )
    const result = (await step?.(
      { email: "stale@example.test", order_id: "order_1" },
      { container }
    )) as {
      output: Array<{ data: Record<string, unknown>; to: string }>
    }
    const productReviews = result.output[0].data.product_reviews as Array<{
      review_url: string
      title: string
    }>

    expect(result.output[0].to).toBe("fetched@example.test")
    expect(result.output[0].data).toMatchObject({
      locale,
      message: reviewUtilities.copy[locale].message,
      storefront_base_url: ["https://", domain].join(""),
    })
    expect(result.output[0].data.items).toContain(
      reviewUtilities.copy[locale].action
    )
    expect(productReviews).toEqual([
      expect.objectContaining({
        review_url: [
          "https://",
          domain,
          "/reviews/product/token%2Fvalue?product_id=prod_1",
        ].join(""),
        title: reviewUtilities.copy[locale].product,
      }),
    ])
    expect(createReviewTokens).not.toHaveBeenCalled()
  })

  it("skips an already logged request before resolving market or creating tokens", async () => {
    await import("../../../../src/workflows/send-product-review-request")

    const { container, listEmailLogs, listReviewTokens } = createContext("sk")
    listEmailLogs.mockResolvedValue([{ order_id: "order_1" }])
    const step = workflowSdkMock.steps.get(
      "build-product-review-request-notification"
    )
    const result = (await step?.({ order_id: "order_1" }, { container })) as {
      output: unknown[]
    }

    expect(result.output).toEqual([])
    expect(resolveNotificationMarketContext).not.toHaveBeenCalled()
    expect(listReviewTokens).not.toHaveBeenCalled()
  })

  it("retains failed deliveries for retry but removes completed and skipped items", async () => {
    const { shouldDeleteProductReviewRequestQueueItem } = await import(
      "../../../../src/workflows/send-product-review-request"
    )
    const notificationInput: CreateNotificationDTO[] = [
      {
        channel: "email",
        template: "product-review-request",
        to: "customer@example.test",
      },
    ]

    expect(
      shouldDeleteProductReviewRequestQueueItem(notificationInput, {
        status: "failure",
      })
    ).toBe(false)
    expect(
      shouldDeleteProductReviewRequestQueueItem(notificationInput, {
        status: "success",
      })
    ).toBe(true)
    expect(shouldDeleteProductReviewRequestQueueItem([], [])).toBe(true)
  })
})
