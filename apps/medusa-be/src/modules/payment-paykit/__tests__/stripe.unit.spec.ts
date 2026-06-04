import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PaykitStripePaymentProvider } from "../services/stripe"
import { createMockContainer, createMockPaykitClient } from "./helpers"

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

  it("uses configured Stripe clients through the public payment flow", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await provider.initiatePayment({
      amount: 10.5,
      currency_code: "czk",
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
        amount: 1050,
        currency: "czk",
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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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

  it("falls back to Stripe Checkout Session retrieval for cs ids", async () => {
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi.fn().mockResolvedValue(null),
      },
      stripeCheckoutSessions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          amount_total: 1050,
          currency: "czk",
          customer: "cus_123",
          metadata: {
            session_id: "payses_123",
          },
          payment_intent: {
            id: "pi_123",
          },
          payment_status: "paid",
          status: "complete",
          url: "https://checkout.stripe.example/session",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getPaymentStatus({
        data: {
          id: "cs_test_123",
        },
      })
    ).resolves.toEqual({
      status: PaymentSessionStatus.CAPTURED,
      data: expect.objectContaining({
        id: "cs_test_123",
        amount: 1050,
        currency: "czk",
        customer: {
          id: "cus_123",
        },
        metadata: {
          session_id: "payses_123",
        },
        payment_intent_id: "pi_123",
        payment_url: "https://checkout.stripe.example/session",
        status: "succeeded",
      }),
    })
    expect(client.payments.retrieve).toHaveBeenCalledWith("cs_test_123")
    expect(client.stripeCheckoutSessions?.retrieve).toHaveBeenCalledWith(
      "cs_test_123",
      { expand: ["payment_intent"] }
    )
  })

  it("prefers expanded Stripe PaymentIntent status for checkout sessions", async () => {
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi.fn().mockResolvedValue(null),
      },
      stripeCheckoutSessions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "cs_test_manual",
          amount_total: 1050,
          currency: "czk",
          metadata: {
            session_id: "payses_123",
          },
          payment_intent: {
            id: "pi_manual",
            amount: 1050,
            currency: "czk",
            customer: "cus_123",
            metadata: {},
            status: "requires_capture",
          },
          payment_status: "unpaid",
          status: "complete",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getPaymentStatus({
        data: {
          id: "cs_test_manual",
        },
      })
    ).resolves.toEqual({
      status: PaymentSessionStatus.AUTHORIZED,
      data: expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        status: "requires_capture",
      }),
    })
  })

  it("does not double-normalize persisted Stripe amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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

  it("captures checkout-session payments by PaymentIntent id while preserving data.id", async () => {
    const client = createMockPaykitClient({
      payments: {
        capture: vi.fn().mockResolvedValue({
          id: "pi_manual",
          amount: 1050,
          currency: "czk",
          status: "succeeded",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.capturePayment({
      data: {
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        amount: 1050,
        currency: "czk",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("pi_manual", {
      amount: 1050,
    })
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        status: "succeeded",
      })
    )
  })

  it("resolves missing PaymentIntent ids from checkout sessions before capture", async () => {
    const client = createMockPaykitClient({
      payments: {
        capture: vi.fn().mockResolvedValue({
          id: "pi_manual",
          amount: 1050,
          currency: "czk",
          status: "succeeded",
        }),
      },
      stripeCheckoutSessions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "cs_test_manual",
          payment_intent: "pi_manual",
          payment_status: "unpaid",
          status: "complete",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.capturePayment({
      data: {
        id: "cs_test_manual",
        amount: 1050,
        currency: "czk",
      },
    })

    expect(client.stripeCheckoutSessions?.retrieve).toHaveBeenCalledWith(
      "cs_test_manual",
      { expand: ["payment_intent"] }
    )
    expect(client.payments.capture).toHaveBeenCalledWith("pi_manual", {
      amount: 1050,
    })
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
      })
    )
  })

  it("refunds checkout-session payments by PaymentIntent id while preserving data.id", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.refundPayment({
      amount: 10.5,
      data: {
        id: "cs_test_123",
        payment_intent_id: "pi_123",
        currency: "czk",
      },
    })

    expect(client.refunds?.create).toHaveBeenCalledWith({
      payment_id: "pi_123",
      amount: 1050,
      reason: null,
      metadata: null,
    })
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "cs_test_123",
        payment_intent_id: "pi_123",
        refund_id: "refund-1",
      })
    )
  })

  it("expires checkout sessions during cancel instead of canceling a PaymentIntent with cs id", async () => {
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        retrieve: vi.fn(),
        expire: vi.fn().mockResolvedValue({
          id: "cs_test_open",
          payment_status: "unpaid",
          status: "expired",
        }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.cancelPayment({
      data: {
        id: "cs_test_open",
      },
    })

    expect(client.stripeCheckoutSessions?.expire).toHaveBeenCalledWith(
      "cs_test_open"
    )
    expect(client.payments.cancel).not.toHaveBeenCalled()
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "cs_test_open",
        status: "canceled",
      })
    )
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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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
        type: "payment.succeeded",
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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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

  it("skips raw Stripe events before the standard payment event", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "stripe.payment_intent.succeeded",
        is_raw: true,
        data: {
          id: "evt_123",
        },
      },
      {
        type: "payment.succeeded",
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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

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
