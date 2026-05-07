import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "../base"
import type { PaykitPaymentClient, PaykitProviderOptions } from "../types"

class TestPaykitPaymentProvider extends PaykitPaymentProviderBase<PaykitProviderOptions> {
  static identifier = "paykit_test"

  // biome-ignore lint/complexity/noUselessConstructor: the base constructor is protected.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitProviderOptions
  ) {
    super(container, options)
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    throw new Error("Unexpected default client")
  }
}

const createClient = (): PaykitPaymentClient => ({
  payments: {
    create: jest.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_action",
      payment_url: "https://payments.example/1",
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_capture",
    }),
    capture: jest.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "succeeded",
    }),
    cancel: jest.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "canceled",
    }),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: "refund-1",
      payment_id: "provider-payment-1",
      amount: 250,
    }),
  },
})

const createProvider = (client = createClient()) =>
  new TestPaykitPaymentProvider({} as any, { client })

describe("PaykitPaymentProviderBase", () => {
  it("persists provider payment id inside data.id on initiatePayment", async () => {
    const client = createClient()
    const provider = createProvider(client)

    const result = await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
        capture_method: "manual",
        metadata: { cart_id: "cart_123" },
        provider_metadata: { return_url: "https://shop.example/return" },
      },
      context: {
        idempotency_key: "payses_123",
        customer: {
          id: "cus_123",
          email: "customer@example.com",
        },
      },
    })

    expect(result).toEqual({
      id: "provider-payment-1",
      status: PaymentSessionStatus.REQUIRES_MORE,
      data: {
        id: "provider-payment-1",
        status: "requires_action",
        payment_url: "https://payments.example/1",
      },
    })
    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        currency: "czk",
        customer: { email: "customer@example.com" },
        item_id: "cart_123",
        capture_method: "manual",
        metadata: {
          cart_id: "cart_123",
          session_id: "payses_123",
        },
        provider_metadata: { return_url: "https://shop.example/return" },
      })
    )
  })

  it("reads provider id from data.id when capturing payment", async () => {
    const client = createClient()
    const provider = createProvider(client)

    await provider.capturePayment({
      data: {
        id: "provider-payment-1",
      },
      amount: 400,
      context: {
        idempotency_key: "capture_123",
      },
    } as any)

    expect(client.payments.capture).toHaveBeenCalledWith("provider-payment-1", {
      amount: 400,
    })
  })

  it("reads refund amount from Medusa refund input and provider id from data.id", async () => {
    const client = createClient()
    const provider = createProvider(client)

    await provider.refundPayment({
      amount: 250,
      data: {
        id: "provider-payment-1",
      },
      context: {
        idempotency_key: "refund_123",
      },
    })

    expect(client.refunds?.create).toHaveBeenCalledWith({
      payment_id: "provider-payment-1",
      amount: 250,
      reason: null,
      metadata: null,
    })
  })

  it("throws clearly when PayKit retrieve returns null", async () => {
    const client = createClient()
    jest.mocked(client.payments.retrieve).mockResolvedValueOnce(null)
    const provider = createProvider(client)

    await expect(
      provider.retrievePayment({
        data: {
          id: "missing-payment",
        },
      })
    ).rejects.toThrow("PayKit payment missing-payment could not be retrieved")
  })

  it("selects the first actionable payment webhook event", async () => {
    const client = createClient()
    client.handleWebhook = jest.fn().mockResolvedValue([
      {
        type: "invoice.generated",
        data: {
          id: "invoice-1",
        },
      },
      {
        type: "payment.created",
        data: {
          id: "provider-payment-1",
          amount: 1000,
          status: "succeeded",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: "",
        headers: {},
      })
    ).resolves.toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: "payses_123",
        amount: 1000,
      },
    })
  })
})
