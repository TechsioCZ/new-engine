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

const resolveCustomerNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  WorkflowResponse: class WorkflowResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  },
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
  createWorkflow: vi.fn((_name: string, handler: unknown) => handler),
}))

vi.mock("../../utils/customer-notification-market-context", () => ({
  resolveCustomerNotificationMarketContext,
}))

vi.mock("../steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))

type Notification = {
  data?: Record<string, unknown>
}

describe("customer registration confirmation workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["sk", "sk-SK", "herbatica.sk"],
    ["cz", "cs-CZ", "herbatica.cz"],
    ["hu", "hu-HU", "herbatica.hu"],
    ["ro", "ro-RO", "herbatica.ro"],
  ])("adds the canonical %s market context to the notification", async (marketCode, locale, domain) => {
    resolveCustomerNotificationMarketContext.mockResolvedValue({
      country_code: marketCode,
      locale,
      market_code: marketCode,
      sales_channel_id: `sc_${marketCode}`,
      store_name: "Herbatica",
      storefront_base_url: `https://${domain}`,
      storefront_domain: domain,
    })
    await import("../send-customer-registration-confirmation")
    const step = workflowSdkMock.steps.get(
      "build-customer-registration-confirmation-notification"
    )

    expect(step).toBeDefined()

    const result = (await step?.(
      {
        customer_id: "cus_123",
        customer_name: "Test Customer",
        email: "customer@example.test",
      },
      { container: { resolve: vi.fn() } }
    )) as { output: Notification[] }

    expect(resolveCustomerNotificationMarketContext).toHaveBeenCalledWith(
      expect.anything(),
      { customerId: "cus_123", email: "customer@example.test" }
    )
    expect(result.output).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          locale,
          market_code: marketCode,
          storefront_base_url: `https://${domain}`,
        }),
        template: "customer-registration-confirmation",
        to: "customer@example.test",
      }),
    ])
  })

  it("fails closed when the customer market is ambiguous", async () => {
    resolveCustomerNotificationMarketContext.mockRejectedValue(
      new Error("Notification market cannot be resolved unambiguously")
    )
    await import("../send-customer-registration-confirmation")
    const step = workflowSdkMock.steps.get(
      "build-customer-registration-confirmation-notification"
    )

    await expect(
      step?.(
        {
          customer_id: "cus_123",
          email: "customer@example.test",
        },
        { container: { resolve: vi.fn() } }
      )
    ).rejects.toThrow("cannot be resolved unambiguously")
  })
})
