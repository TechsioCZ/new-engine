import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PaykitStripePaymentProvider } from "../stripe"
import { createMockPaykitClient } from "./helpers"

describe("PaykitStripePaymentProvider", () => {
  it("validates required Stripe options", () => {
    expect(() => PaykitStripePaymentProvider.validateOptions({})).toThrow(
      "PayKit Stripe missing required option(s): apiKey, webhookSecret"
    )

    expect(() =>
      PaykitStripePaymentProvider.validateOptions({
        apiKey: "sk_test_123",
        webhookSecret: "whsec_123",
      })
    ).not.toThrow()
  })

  it("creates the default PayKit Stripe client with constructor-safe options", async () => {
    const provider = new PaykitStripePaymentProvider({} as any, {
      apiKey: "sk_test_123",
      webhookSecret: "whsec_123",
    })

    await expect((provider as any).getClient()).resolves.toEqual(
      expect.objectContaining({
        payments: expect.any(Object),
        refunds: expect.any(Object),
        handleWebhook: expect.any(Function),
      })
    )
  })

  it("normalizes Medusa major-unit amounts to Stripe smallest units", async () => {
    const client = createMockPaykitClient({
      payments: {
        create: vi.fn().mockResolvedValue({
          id: "stripe-payment-1",
          amount: 1050,
          currency: "czk",
          status: "requires_action",
          payment_url: "https://checkout.stripe.example/session",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    const result = await provider.initiatePayment({
      amount: 10.5,
      currency_code: "czk",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
        provider_metadata: {
          success_url: "https://shop.example/checkout/success",
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
        amount: 1050,
      })
    )
    expect(result).toEqual({
      id: "stripe-payment-1",
      status: PaymentSessionStatus.REQUIRES_MORE,
      data: {
        id: "stripe-payment-1",
        amount: 1050,
        currency: "czk",
        status: "requires_action",
        payment_url: "https://checkout.stripe.example/session",
      },
    })
  })

  it("normalizes three-decimal Stripe currencies to Stripe's nearest-ten smallest units", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await provider.initiatePayment({
      amount: 10.123,
      currency_code: "bhd",
      data: {
        session_id: "payses_123",
        item_id: "cart_123",
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
        amount: 10_130,
      })
    )
  })

  it("does not double-normalize persisted Stripe amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await provider.capturePayment({
      data: {
        id: "stripe-payment-1",
        amount: 1050,
        currency: "czk",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("stripe-payment-1", {
      amount: 1050,
    })
  })

  it("maps authorized Stripe webhook events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.updated",
        data: {
          id: "stripe-payment-1",
          amount: 1050,
          currency: "czk",
          status: "requires_capture",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: "",
        headers: {
          "stripe-signature": "sig_123",
        },
      })
    ).resolves.toEqual({
      action: PaymentActions.AUTHORIZED,
      data: {
        session_id: "payses_123",
        amount: 10.5,
      },
    })
  })

  it("maps successful Stripe webhook events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.updated",
        data: {
          id: "stripe-payment-1",
          amount: 1050,
          currency: "czk",
          status: "succeeded",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: "",
        headers: {
          "stripe-signature": "sig_123",
        },
      })
    ).resolves.toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: "payses_123",
        amount: 10.5,
      },
    })
  })

  it("maps verified Stripe payment intent events when PayKit reports them as unhandled", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi
      .fn()
      .mockRejectedValue(
        new Error("Unhandled event type: payment_intent.succeeded")
      )
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: JSON.stringify({
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "stripe-payment-1",
              amount: 1050,
              currency: "czk",
              status: "succeeded",
              metadata: {
                session_id: "payses_123",
              },
            },
          },
        }),
        headers: {
          "stripe-signature": "sig_123",
        },
      })
    ).resolves.toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: "payses_123",
        amount: 10.5,
      },
    })
  })

  it("maps Stripe checkout invoice events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "invoice.generated",
        data: {
          id: "cs_test_123",
          amount_paid: 1050,
          currency: "czk",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = new PaykitStripePaymentProvider({} as any, { client })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        rawData: "",
        headers: {
          "stripe-signature": "sig_123",
        },
      })
    ).resolves.toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: "payses_123",
        amount: 10.5,
      },
    })
  })
})
