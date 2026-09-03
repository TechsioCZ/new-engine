import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())
const generateJwtToken = vi.hoisted(() => vi.fn(() => "token/with+symbols"))

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  generateJwtToken,
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

vi.mock("../../../../../src/utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

type MockStepResponse<TPayload> = {
  payload: TPayload
}

type PrepareStep = (
  input: { customer_id: string; sales_channel_id: string },
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
  {
    country_code: "hu",
    locale: "hu-HU",
    market_code: "hu",
    sales_channel_id: "sc_hu",
    storefront_base_url: "https://herbatica.hu",
    storefront_domain: "herbatica.hu",
  },
  {
    country_code: "ro",
    locale: "ro-RO",
    market_code: "ro",
    sales_channel_id: "sc_ro",
    storefront_base_url: "https://herbatica.ro",
    storefront_domain: "herbatica.ro",
  },
]

const deactivationPathByMarket = {
  cz: "/ucet/zruseni-uctu",
  hu: "/fiok/fiok-torlese",
  ro: "/cont/dezactivare-cont",
  sk: "/ucet/zrusenie-uctu",
} as const

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
  )("uses the requested $market_code market context for the confirmation link and token", async (marketContext) => {
    resolveNotificationMarketContext.mockResolvedValue(marketContext)
    const { prepareCustomerAccountDeactivationRequestStep } = await import(
      "../../../../../src/workflows/customer/steps/prepare-customer-account-deactivation-request"
    )
    const container = makeContainer()

    const result = await (
      prepareCustomerAccountDeactivationRequestStep as PrepareStep
    )(
      {
        customer_id: "cus_1",
        sales_channel_id: marketContext.sales_channel_id,
      },
      { container }
    )

    expect(resolveNotificationMarketContext).toHaveBeenCalledWith(container, {
      salesChannelId: marketContext.sales_channel_id,
    })
    expect(generateJwtToken).toHaveBeenCalledWith(
      {
        customer_id: "cus_1",
        email: "customer@example.test",
        purpose: "customer-account-deactivation",
        sales_channel_id: marketContext.sales_channel_id,
      },
      {
        expiresIn: "30m",
        secret: "test-jwt-secret",
      }
    )
    expect(result.payload).toEqual({
      ...marketContext,
      confirmation_url: [
        marketContext.storefront_base_url,
        deactivationPathByMarket[
          marketContext.market_code as keyof typeof deactivationPathByMarket
        ],
        "?token=token%2Fwith%2Bsymbols",
      ].join(""),
      customer_id: "cus_1",
      customer_name: "Test Customer",
      email: "customer@example.test",
    })
  })

  it("rejects a market resolver result bound to another Sales Channel", async () => {
    resolveNotificationMarketContext.mockResolvedValue({
      ...marketFixtures[0],
      sales_channel_id: "sc_other",
    })
    const { prepareCustomerAccountDeactivationRequestStep } = await import(
      "../../../../../src/workflows/customer/steps/prepare-customer-account-deactivation-request"
    )
    const container = makeContainer()

    await expect(
      (prepareCustomerAccountDeactivationRequestStep as PrepareStep)(
        { customer_id: "cus_1", sales_channel_id: "sc_sk" },
        { container }
      )
    ).rejects.toThrow(
      "Account deactivation market does not match the requested Sales Channel."
    )
    expect(generateJwtToken).not.toHaveBeenCalled()
  })
})
