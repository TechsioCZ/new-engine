import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "../core/base"
import type { PaykitAdapterOptions, PaykitPaymentClient } from "../types"
import { createMockContainer, createMockPaykitClient } from "./helpers"

class TestPaykitPaymentProvider extends PaykitPaymentProviderBase<PaykitAdapterOptions> {
  static identifier = "paykit_test"

  // biome-ignore lint/complexity/noUselessConstructor: the base constructor is protected.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitAdapterOptions
  ) {
    super(container, options)
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    throw new Error("Unexpected default client")
  }
}

const createProvider = (client = createMockPaykitClient()) =>
  new TestPaykitPaymentProvider(createMockContainer(), { client })

const createProviderWithoutClient = () =>
  new TestPaykitPaymentProvider(createMockContainer(), {})

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

  it("requires Medusa payment session id on initiatePayment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await expect(
      provider.initiatePayment({
        amount: 1000,
        currency_code: "czk",
        data: {
          item_id: "cart_123",
        },
        context: {
          customer: {
            id: "cus_123",
            email: "customer@example.com",
          },
        },
      })
    ).rejects.toThrow("PayKit requires session_id in payment session data")
    expect(client.payments.create).not.toHaveBeenCalled()
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

  it("passes PayKit-shaped payment session billing data to PayKit create payment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
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
          carrier: "standard",
        },
      },
      context: {
        customer: {
          id: "cus_123",
          email: "customer@example.com",
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
          carrier: "standard",
          currency: "czk",
        },
      })
    )
  })

  it("passes Medusa-shaped payment session billing data to PayKit create payment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
        billing: {
          first_name: "Ada",
          last_name: "Lovelace",
          address_1: "1 Engine Way",
          city: "London",
          country_code: "GB",
          postal_code: "NW1",
        },
      },
      context: {
        customer: {
          id: "cus_123",
          email: "customer@example.com",
        },
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: expect.objectContaining({
            name: "Ada Lovelace",
            line1: "1 Engine Way",
            line2: "",
            city: "London",
            postal_code: "NW1",
            country: "GB",
          }),
          currency: "czk",
        },
      })
    )
  })

  it("prefers explicit payment session billing data over customer context billing", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
        billing: {
          address: {
            name: "Checkout Buyer",
            line1: "99 Checkout Street",
            line2: "",
            city: "Prague",
            postal_code: "11000",
            country: "CZ",
          },
        },
      },
      context: {
        customer: {
          id: "cus_123",
          email: "customer@example.com",
          billing_address: {
            first_name: "Default",
            last_name: "Customer",
            address_1: "1 Default Way",
            city: "Brno",
            country_code: "CZ",
            postal_code: "60200",
          },
        },
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: expect.objectContaining({
            name: "Checkout Buyer",
            line1: "99 Checkout Street",
            city: "Prague",
            postal_code: "11000",
            country: "CZ",
          }),
          currency: "czk",
        },
      })
    )
  })

  it("maps legacy string customers to PayKit payee objects", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_email",
        item_id: "cart_email",
        customer: "customer@example.com",
      },
      context: {},
    })

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_id",
        item_id: "cart_id",
        customer: "cus_123",
      },
      context: {},
    })

    expect(client.payments.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        customer: { email: "customer@example.com" },
      })
    )
    expect(client.payments.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        customer: { id: "cus_123" },
      })
    )
  })

  it("falls back to customer id when object customer email is invalid", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    await provider.initiatePayment({
      amount: 1000,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
        customer: {
          email: "not-an-email",
          id: "cus_123",
        },
      },
      context: {},
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: { id: "cus_123" },
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

  it("rejects refunds when the PayKit provider does not expose refunds.create", async () => {
    const fullClient = createMockPaykitClient()
    const client: PaykitPaymentClient = {
      payments: fullClient.payments,
      customers: fullClient.customers,
      handleWebhook: fullClient.handleWebhook,
    }
    const provider = createProvider(client)

    await expect(
      provider.refundPayment({
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
    ).rejects.toThrow("PayKit provider does not support refunds")
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

  it("falls back to account holder id when PayKit customer retrieval is unsupported", async () => {
    const unsupported = new Error("Customer retrieval is not supported")
    unsupported.name = "ProviderNotSupportedError"
    const client = createMockPaykitClient({
      customers: {
        retrieve: vi.fn().mockRejectedValue(unsupported),
      },
    })
    const provider = createProvider(client)

    await expect(
      provider.retrieveAccountHolder({
        id: "customer-1",
      })
    ).resolves.toEqual({
      id: "customer-1",
    })
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

  it("returns not supported when PayKit does not return webhook events", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue(undefined)
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: "",
        headers: {},
      })
    ).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
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

  it("maps standard failed payment webhook events without Medusa workflow data", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.failed",
        data: {
          id: "provider-payment-1",
          amount: 1000,
          status: "failed",
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
      action: PaymentActions.FAILED,
    })
  })
})
