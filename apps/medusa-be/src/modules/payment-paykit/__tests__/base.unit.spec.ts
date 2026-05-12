import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "../base"
import type { PaykitPaymentClient, PaykitProviderOptions } from "../types"
import { createMockPaykitClient } from "./helpers"

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

const createProvider = (client = createMockPaykitClient()) =>
  new TestPaykitPaymentProvider({} as any, { client })

const createProviderWithoutClient = () =>
  new TestPaykitPaymentProvider({} as any, {})

describe("PaykitPaymentProviderBase", () => {
  it("persists provider payment id inside data.id on initiatePayment", async () => {
    const client = createMockPaykitClient()
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

  it("passes Medusa customer billing data to PayKit create payment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
      },
      context: {
        customer: {
          id: "cus_123",
          email: "customer@example.com",
          billing_address: {
            first_name: "Ada",
            last_name: "Lovelace",
            address_1: "1 Engine Way",
            address_2: "Suite 2",
            city: "London",
            country_code: "GB",
            postal_code: "NW1",
            province: "London",
            phone: "+420123456789",
          },
        },
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: {
            name: "Ada Lovelace",
            line1: "1 Engine Way",
            line2: "Suite 2",
            city: "London",
            state: "London",
            postal_code: "NW1",
            country: "GB",
            phone: "+420123456789",
          },
          currency: "czk",
        },
      })
    )
  })

  it("reads provider id from data.id when capturing payment", async () => {
    const client = createMockPaykitClient()
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
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    const result = await provider.refundPayment({
      amount: 250,
      data: {
        id: "provider-payment-1",
        amount: 1000,
        currency: "czk",
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
    expect(result.data).toEqual({
      id: "provider-payment-1",
      amount: 1000,
      currency: "czk",
      refund: {
        id: "refund-1",
        payment_id: "provider-payment-1",
        amount: 250,
      },
      refund_id: "refund-1",
    })
  })

  it("passes metadata and provider metadata through on updatePayment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.updatePayment({
      amount: 1100,
      currency_code: "czk",
      data: {
        id: "provider-payment-1",
        metadata: {
          cart_id: "cart_123",
          nested: { key: "value" },
        },
        provider_metadata: {
          return_url: "https://shop.example/return",
        },
      },
    })

    expect(client.payments.update).toHaveBeenCalledWith("provider-payment-1", {
      amount: 1100,
      currency: "czk",
      metadata: {
        cart_id: "cart_123",
        nested: '{"key":"value"}',
      },
      provider_metadata: {
        return_url: "https://shop.example/return",
      },
    })
  })

  it("does not fail Medusa rollback deletes when provider id was not persisted yet", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await expect(
      provider.deletePayment({
        data: {
          session_id: "payses_123",
        },
      })
    ).resolves.toEqual({
      data: {
        session_id: "payses_123",
      },
    })
    expect(client.payments.cancel).not.toHaveBeenCalled()
  })

  it("does not initialize a PayKit client for deletes without a provider id", async () => {
    const provider = createProviderWithoutClient()

    await expect(
      provider.deletePayment({
        data: {
          session_id: "payses_123",
        },
      })
    ).resolves.toEqual({
      data: {
        session_id: "payses_123",
      },
    })
  })

  it("throws when canceling an authorized payment without a provider id", async () => {
    const provider = createProviderWithoutClient()

    await expect(
      provider.cancelPayment({
        data: {
          session_id: "payses_123",
        },
      })
    ).rejects.toThrow("PayKit payment id is missing from payment data.id")
  })

  it("throws clearly when PayKit retrieve returns null", async () => {
    const client = createMockPaykitClient()
    vi.mocked(client.payments.retrieve).mockResolvedValueOnce(null)
    const provider = createProvider(client)

    await expect(
      provider.retrievePayment({
        data: {
          id: "missing-payment",
        },
      })
    ).rejects.toThrow("PayKit payment missing-payment could not be retrieved")
  })

  it("creates PayKit account holders when customer support is available", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await expect(
      provider.createAccountHolder({
        context: {
          customer: {
            id: "cus_123",
            email: "customer@example.com",
            first_name: "Ada",
            last_name: "Lovelace",
            phone: "+420123456789",
          },
        },
      })
    ).resolves.toEqual({
      id: "customer-1",
      data: {
        id: "customer-1",
        email: "customer@example.com",
        name: "Customer",
        phone: "",
      },
    })
    expect(client.customers?.create).toHaveBeenCalledWith({
      billing: null,
      email: "customer@example.com",
      name: "Ada Lovelace",
      phone: "+420123456789",
      metadata: {
        medusa_customer_id: "cus_123",
      },
    })
  })

  it("treats unsupported PayKit customer creation like an optional Medusa provider method", async () => {
    const unsupported = new Error("Customer creation is not supported")
    unsupported.name = "ProviderNotSupportedError"
    const client = createMockPaykitClient({
      customers: {
        create: vi.fn().mockRejectedValue(unsupported),
      },
    })
    const provider = createProvider(client)

    await expect(
      provider.createAccountHolder({
        context: {
          customer: {
            id: "cus_123",
            email: "customer@example.com",
          },
        },
      })
    ).resolves.toEqual({})
  })

  it("selects the first actionable payment webhook event", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
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

  it("does not return webhook data for pending payment events", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.created",
        data: {
          id: "provider-payment-1",
          amount: 1000,
          status: "pending",
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
      action: PaymentActions.PENDING,
    })
  })
})
