import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => ({
  steps: new Map<string, (...arguments_: unknown[]) => unknown>(),
}))
const resolveCustomerNotificationMarketContext = vi.hoisted(() => vi.fn())
const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => ({
  MedusaError: class MedusaError extends Error {
    static Types = { INVALID_DATA: "invalid_data" }

    constructor(_type: string, message: string) {
      super(message)
    }
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
  WorkflowResponse: class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
}))

vi.mock("../../../../src/utils/customer-notification-market-context", () => ({
  resolveCustomerNotificationMarketContext,
}))

vi.mock("../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

vi.mock("../../../../src/workflows/steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))

const MARKETS = [
  { countryCode: "sk", domain: "herbatica.sk", locale: "sk-SK" },
  { countryCode: "cz", domain: "herbatica.cz", locale: "cs-CZ" },
  { countryCode: "hu", domain: "herbatica.hu", locale: "hu-HU" },
  { countryCode: "ro", domain: "herbatica.ro", locale: "ro-RO" },
] as const

describe("send forgot password notification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(MARKETS)("builds a canonical $countryCode reset URL", async ({
    countryCode,
    domain,
    locale,
  }) => {
    await import("../../../../src/workflows/send-forgot-password")
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: countryCode,
      locale,
      market_code: countryCode,
      sales_channel_id: ["sc_", countryCode].join(""),
      storefront_base_url: ["https://", domain].join(""),
      storefront_domain: domain,
    })

    const step = workflowSdkMock.steps.get("build-forgot-password-notification")
    const result = (await step?.(
      {
        email: " customer+reset@example.test ",
        storefrontMarketCode: ` ${countryCode} `,
        token: " token/value ",
      },
      { container: { resolve: vi.fn() } }
    )) as { output: Array<{ data: Record<string, unknown>; to: string }> }

    expect(result.output[0]).toMatchObject({
      data: {
        country_code: countryCode,
        locale,
        reset_url: [
          "https://",
          domain,
          "/auth/reset-password?token=token%2Fvalue&email=customer%2Breset%40example.test",
        ].join(""),
        storefront_base_url: ["https://", domain].join(""),
      },
      to: "customer+reset@example.test",
    })
    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(
      expect.anything(),
      { countryCode }
    )
    expect(resolveCustomerNotificationMarketContext).not.toHaveBeenCalled()
  })

  it("falls back to customer context when request metadata has no market", async () => {
    await import("../../../../src/workflows/send-forgot-password")
    resolveCustomerNotificationMarketContext.mockResolvedValue({
      country_code: "sk",
      locale: "sk-SK",
      market_code: "sk",
      sales_channel_id: "sc_sk",
      storefront_base_url: "https://herbatica.sk",
      storefront_domain: "herbatica.sk",
    })

    const step = workflowSdkMock.steps.get("build-forgot-password-notification")
    await step?.(
      { email: "legacy-customer@example.test", token: "token" },
      { container: { resolve: vi.fn() } }
    )

    expect(resolveCustomerNotificationMarketContext).toHaveBeenCalledWith(
      expect.anything(),
      { email: "legacy-customer@example.test" }
    )
    expect(resolveNotificationMarketContext).not.toHaveBeenCalled()
  })

  it.each([
    { email: " ", token: "token" },
    { email: "customer@example.test", token: " " },
  ])("rejects incomplete reset input before market lookup", async (input) => {
    await import("../../../../src/workflows/send-forgot-password")

    const step = workflowSdkMock.steps.get("build-forgot-password-notification")

    await expect(step?.(input, { container: {} })).rejects.toThrow()
    expect(resolveCustomerNotificationMarketContext).not.toHaveBeenCalled()
    expect(resolveNotificationMarketContext).not.toHaveBeenCalled()
  })
})
