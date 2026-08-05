import {
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { PaykitPaymentProviderBase } from "../core/base"
import type { PaykitInjectedDependencies } from "../core/base"
import type { PaykitAdapterOptions, PaykitPaymentClient } from "../types"
import { createMockContainer, createMockPaykitClient } from "./helpers"

class TestPaykitPaymentProvider extends PaykitPaymentProviderBase {
  static override identifier = "paykit_test"

  // the base constructor is protected.
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

const unsupportedRefundMessage = /PayKit provider does not support refunds/
const refundMissingIdMessage = /PayKit refund response did not include an id/

describe(PaykitPaymentProviderBase, () => {
  it("persists provider payment id inside data.id on initiatePayment", async () => {
    const client = createMockPaykitClient()
    const provider = createProvider(client)

    const result = await provider.initiatePayment({
      amount: 1000,
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
        },
        idempotency_key: "payses_123",
      },
      currency_code: "czk",
      data: {
        capture_method: "manual",
        item_id: "cart_123",
        metadata: { cart_id: "cart_123" },
        provider_metadata: { return_url: "https://shop.example/return" },
        session_id: "payses_123",
      },
    })

    expect(result).toStrictEqual({
      data: {
        id: "provider-payment-1",
        payment_url: "https://payments.example/1",
        status: "requires_action",
      },
      id: "provider-payment-1",
      status: PaymentSessionStatus.REQUIRES_MORE,
    })
    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        capture_method: "manual",
        currency: "czk",
        customer: { email: "customer@example.com" },
        item_id: "cart_123",
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
        context: {
          customer: {
            email: "customer@example.com",
            id: "cus_123",
          },
        },
        currency_code: "czk",
        data: {
          item_id: "cart_123",
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
      context: {
        customer: {
          billing_address: {
            address_1: "1 Engine Way",
            address_2: "Suite 2",
            city: "London",
            country_code: "GB",
            phone: "+420123456789",
            postal_code: "NW1",
            province: "London",
          },
          email: "customer@example.com",
          first_name: "Ada",
          id: "cus_123",
          last_name: "Lovelace",
        },
      },
      currency_code: "czk",
      data: {
        item_id: "cart_123",
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: {
            city: "London",
            country: "GB",
            line1: "1 Engine Way",
            line2: "Suite 2",
            name: "Ada Lovelace",
            phone: "+420123456789",
            postal_code: "NW1",
            state: "London",
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
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
        },
      },
      currency_code: "czk",
      data: {
        billing: {
          address: {
            city: "London",
            country: "GB",
            line1: "1 Engine Way",
            line2: "Suite 2",
            name: "Ada Lovelace",
            phone: "+420123456789",
            postal_code: "NW1",
            state: "London",
          },
          carrier: "standard",
        },
        item_id: "cart_123",
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: {
            city: "London",
            country: "GB",
            line1: "1 Engine Way",
            line2: "Suite 2",
            name: "Ada Lovelace",
            phone: "+420123456789",
            postal_code: "NW1",
            state: "London",
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
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
        },
      },
      currency_code: "czk",
      data: {
        billing: {
          address_1: "1 Engine Way",
          city: "London",
          country_code: "GB",
          first_name: "Ada",
          last_name: "Lovelace",
          postal_code: "NW1",
        },
        item_id: "cart_123",
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: expect.objectContaining({
            city: "London",
            country: "GB",
            line1: "1 Engine Way",
            line2: "",
            name: "Ada Lovelace",
            postal_code: "NW1",
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
      context: {
        customer: {
          billing_address: {
            address_1: "1 Default Way",
            city: "Brno",
            country_code: "CZ",
            postal_code: "60200",
          },
          email: "customer@example.com",
          first_name: "Default",
          id: "cus_123",
          last_name: "Customer",
        },
      },
      currency_code: "czk",
      data: {
        billing: {
          address: {
            city: "Prague",
            country: "CZ",
            line1: "99 Checkout Street",
            line2: "",
            name: "Checkout Buyer",
            postal_code: "11000",
          },
        },
        item_id: "cart_123",
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        billing: {
          address: expect.objectContaining({
            city: "Prague",
            country: "CZ",
            line1: "99 Checkout Street",
            name: "Checkout Buyer",
            postal_code: "11000",
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
      context: {},
      currency_code: "czk",
      data: {
        customer: "customer@example.com",
        item_id: "cart_email",
        session_id: "payses_email",
      },
    })

    await provider.initiatePayment({
      amount: 1000,
      context: {},
      currency_code: "czk",
      data: {
        customer: "cus_123",
        item_id: "cart_id",
        session_id: "payses_id",
      },
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
      context: {},
      currency_code: "czk",
      data: {
        customer: {
          email: "not-an-email",
          id: "cus_123",
        },
        item_id: "cart_123",
        session_id: "payses_123",
      },
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
      amount: 400,
      context: {
        idempotency_key: "capture_123",
      },
      data: {
        id: "provider-payment-1",
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
      context: {
        idempotency_key: "refund_123",
      },
      data: {
        amount: 1000,
        currency: "czk",
        id: "provider-payment-1",
      },
    })

    expect(client.refunds?.create).toHaveBeenCalledWith({
      amount: 250,
      metadata: null,
      payment_id: "provider-payment-1",
      reason: null,
    })
    expect(result.data).toStrictEqual({
      amount: 1000,
      currency: "czk",
      id: "provider-payment-1",
      refund: {
        amount: 250,
        id: "refund-1",
        payment_id: "provider-payment-1",
      },
      refund_id: "refund-1",
    })
  })

  it("rejects refunds when the PayKit provider does not expose refunds.create", async () => {
    const fullClient = createMockPaykitClient()
    const client: PaykitPaymentClient = {
      payments: fullClient.payments,
      ...(fullClient.customers ? { customers: fullClient.customers } : {}),
      ...(fullClient.handleWebhook
        ? { handleWebhook: fullClient.handleWebhook }
        : {}),
    }
    const provider = createProvider(client)

    await expect(
      provider.refundPayment({
        amount: 250,
        context: {
          idempotency_key: "refund_123",
        },
        data: {
          amount: 1000,
          currency: "czk",
          id: "provider-payment-1",
        },
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(unsupportedRefundMessage),
      type: MedusaError.Types.NOT_ALLOWED,
    })
  })

  it("rejects refund responses without a provider refund id", async () => {
    const client = createMockPaykitClient({
      refunds: {
        create: vi.fn().mockResolvedValue({
          amount: 250,
          payment_id: "provider-payment-1",
        }),
      },
    })
    const provider = createProvider(client)

    await expect(
      provider.refundPayment({
        amount: 250,
        context: {
          idempotency_key: "refund_123",
        },
        data: {
          amount: 1000,
          currency: "czk",
          id: "provider-payment-1",
        },
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(refundMissingIdMessage),
      type: MedusaError.Types.INVALID_DATA,
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
    ).resolves.toStrictEqual({
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
    ).resolves.toStrictEqual({
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
            email: "customer@example.com",
            first_name: "Ada",
            id: "cus_123",
            last_name: "Lovelace",
            phone: "+420123456789",
          },
        },
      })
    ).resolves.toStrictEqual({
      data: {
        email: "customer@example.com",
        id: "customer-1",
        name: "Customer",
        phone: "",
      },
      id: "customer-1",
    })
    expect(client.customers?.create).toHaveBeenCalledWith({
      billing: null,
      email: "customer@example.com",
      metadata: {
        medusa_customer_id: "cus_123",
      },
      name: "Ada Lovelace",
      phone: "+420123456789",
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
            email: "customer@example.com",
            id: "cus_123",
          },
        },
      })
    ).resolves.toStrictEqual({})
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
    ).resolves.toStrictEqual({
      id: "customer-1",
    })
  })

  it("selects the first actionable payment webhook event", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        data: {
          id: "invoice-1",
        },
        type: "invoice.generated",
      },
      {
        data: {
          amount: 1000,
          id: "provider-payment-1",
          metadata: {
            session_id: "payses_123",
          },
          status: "succeeded",
        },
        type: "payment.created",
      },
    ])
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {},
        rawData: "",
      })
    ).resolves.toStrictEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        amount: 1000,
        session_id: "payses_123",
      },
    })
  })

  it("returns not supported when PayKit does not return webhook events", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue()
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {},
        rawData: "",
      })
    ).resolves.toStrictEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
  })

  it("does not return webhook data for pending payment events", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        data: {
          amount: 1000,
          id: "provider-payment-1",
          metadata: {
            session_id: "payses_123",
          },
          status: "pending",
        },
        type: "payment.created",
      },
    ])
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {},
        rawData: "",
      })
    ).resolves.toStrictEqual({
      action: PaymentActions.PENDING,
    })
  })

  it("maps standard failed payment webhook events without Medusa workflow data", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        data: {
          amount: 1000,
          id: "provider-payment-1",
          metadata: {
            session_id: "payses_123",
          },
          status: "failed",
        },
        type: "payment.failed",
      },
    ])
    const provider = createProvider(client)

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {},
        rawData: "",
      })
    ).resolves.toStrictEqual({
      action: PaymentActions.FAILED,
    })
  })
})
