import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const resolveCustomerNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  generateJwtToken: vi.fn(() => "token/with+symbols"),
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
      NOT_ALLOWED: "not_allowed",
      NOT_FOUND: "not_found",
      UNEXPECTED_STATE: "unexpected_state",
    }

    constructor(_type: string, message: string) {
      super(message)
    }
  },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke) => invoke),
  StepResponse: class StepResponse<TPayload> {
    payload: TPayload

    constructor(payload: TPayload) {
      this.payload = payload
    }
  },
}))

vi.mock(
  "../../../../../src/utils/customer-notification-market-context",
  () => ({
    resolveCustomerNotificationMarketContext,
  })
)

type MockStepResponse<TPayload> = {
  payload: TPayload
}

type PrepareStep = (
  input: { customer_id: string },
  context: { container: ReturnType<typeof makeContainer> }
) => Promise<MockStepResponse<Record<string, unknown>>>

const graph = vi.fn()

const makeContainer = () => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    throw new Error("Unexpected dependency")
  }),
})

const marketFixtures = [
  {
    country_code: "sk",
    locale: "sk-SK",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    storefront_base_url: "https://herbatica.sk",
    storefront_domain: "herbatica.sk",
  },
  {
    country_code: "cz",
    locale: "cs-CZ",
    market_code: "cz",
    sales_channel_id: "sc_cz",
    storefront_base_url: "https://herbatica.cz",
    storefront_domain: "herbatica.cz",
  },
]

describe("prepareCustomerAccountDeactivationRequestStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("JWT_SECRET", "test-jwt-secret")
    graph.mockResolvedValue({
      data: [
        {
          deleted_at: null,
          email: "customer@example.test",
          first_name: "Test",
          id: "cus_1",
          last_name: "Customer",
        },
      ],
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(
    marketFixtures
  )("uses resolved $market_code market context for the confirmation link", async (marketContext) => {
    resolveCustomerNotificationMarketContext.mockResolvedValue(marketContext)
    const { prepareCustomerAccountDeactivationRequestStep } = await import(
      "../../../../../src/workflows/customer/steps/prepare-customer-account-deactivation-request"
    )
    const container = makeContainer()

    const result = await (
      prepareCustomerAccountDeactivationRequestStep as PrepareStep
    )({ customer_id: "cus_1" }, { container })

    expect(resolveCustomerNotificationMarketContext).toHaveBeenCalledWith(
      container,
      {
        customerId: "cus_1",
        email: "customer@example.test",
      }
    )
    expect(result.payload).toEqual({
      ...marketContext,
      confirmation_url: [
        marketContext.storefront_base_url,
        marketContext.market_code === "sk"
          ? "/ucet/zrusenie-uctu?token=token%2Fwith%2Bsymbols"
          : "/ucet/zruseni-uctu?token=token%2Fwith%2Bsymbols",
      ].join(""),
      customer_id: "cus_1",
      customer_name: "Test Customer",
      email: "customer@example.test",
    })
  })
})
