import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
    QUERY: "query",
  },
  generateJwtToken: vi.fn(() => "account-token"),
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
      NOT_FOUND: "not_found",
    }
  },
  Modules: {
    AUTH: "auth",
    CUSTOMER: "customer",
  },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke) => invoke),
  createWorkflow: vi.fn(),
  StepResponse: class StepResponse<TPayload> {
    payload: TPayload

    constructor(payload: TPayload) {
      this.payload = payload
    }
  },
  transform: vi.fn(),
  WorkflowResponse: class WorkflowResponse {},
  when: vi.fn(),
}))

vi.mock("../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

vi.mock("../../../../src/workflows/steps/send-notification", () => ({
  sendNotificationStep: vi.fn(),
}))

type MockStepResponse<TPayload> = {
  payload: TPayload
}

type PrepareStep = (
  input: { order_id: string },
  context: { container: ReturnType<typeof makeContainer> }
) => Promise<MockStepResponse<Record<string, unknown>>>

type MarkStep = (
  input: { customer_id?: string; delivered: boolean },
  context: { container: ReturnType<typeof makeContainer> }
) => Promise<MockStepResponse<{ skipped: boolean }>>

const graph = vi.fn()
const updateAuthIdentities = vi.fn()
const updateCustomers = vi.fn()

const makeContainer = () => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "logger") {
      return { warn: vi.fn() }
    }

    if (key === "customer") {
      return { updateCustomers }
    }

    if (key === "auth") {
      return { updateAuthIdentities }
    }

    throw new Error("Unexpected dependency")
  }),
})

describe("send account setup steps", () => {
  beforeEach(() => {
    graph.mockReset()
    resolveNotificationMarketContext.mockReset()
    updateAuthIdentities.mockReset()
    updateCustomers.mockReset()
    resolveNotificationMarketContext.mockResolvedValue({
      country_code: "sk",
      locale: "sk-SK",
      market_code: "sk",
      sales_channel_id: "sc_sk",
      storefront_base_url: "https://herbatica.sk",
      storefront_domain: "herbatica.sk",
    })
    vi.stubEnv("JWT_SECRET", "test-jwt-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("prepares delivery without claiming the notification was sent", async () => {
    const { prepareAccountSetupStep } = await import(
      "../../../../src/workflows/send-account-setup"
    )
    const order = {
      customer: {
        email: "customer@example.test",
        has_account: false,
        id: "cus_1",
      },
      display_id: 42,
      email: "customer@example.test",
      id: "order_1",
      metadata: { account_setup_requested: true },
      sales_channel_id: "sc_sk",
      shipping_address: { country_code: "sk" },
    }

    graph.mockResolvedValueOnce({ data: [order] }).mockResolvedValueOnce({
      data: [{ auth_identity_id: "auth_1", id: "provider_1" }],
    })

    const container = makeContainer()
    const result = await (prepareAccountSetupStep as PrepareStep)(
      { order_id: "order_1" },
      { container }
    )

    expect(result.payload).toMatchObject({
      country_code: "sk",
      customer_id: "cus_1",
      delivery_required: true,
      locale: "sk-SK",
      market_code: "sk",
      order_id: "order_1",
      reset_url:
        "https://herbatica.sk/ucet/obnova-hesla?token=account-token&email=customer%40example.test&flow=account-setup",
      sales_channel_id: "sc_sk",
      storefront_base_url: "https://herbatica.sk",
      storefront_domain: "herbatica.sk",
    })
    expect(result.payload).not.toHaveProperty("sent")
    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      countryCode: "sk",
      salesChannelId: "sc_sk",
    })
    expect(updateAuthIdentities).toHaveBeenCalledWith({
      id: "auth_1",
      app_metadata: { customer_id: "cus_1" },
    })
  })

  it("marks the customer only after confirmed delivery", async () => {
    const { markCustomerHasAccountStep } = await import(
      "../../../../src/workflows/send-account-setup"
    )
    const container = makeContainer()

    await (markCustomerHasAccountStep as MarkStep)(
      { customer_id: "cus_1", delivered: false },
      { container }
    )
    expect(updateCustomers).not.toHaveBeenCalled()

    await (markCustomerHasAccountStep as MarkStep)(
      { customer_id: "cus_1", delivered: true },
      { container }
    )
    expect(updateCustomers).toHaveBeenCalledWith("cus_1", { has_account: true })
  })
})
