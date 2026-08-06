import type { CapturePaymentInput } from "@medusajs/framework/types"
import {
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { PaykitStripePaymentProvider } from "../services/stripe"
import type { PaykitPaymentClient } from "../types"
import { createMockContainer, createMockPaykitClient } from "./helpers"

// PaykitStripePaymentProvider.capturePayment reads an explicit `amount`
// override that is not part of the official CapturePaymentInput DTO but is
// still supported at runtime via a structural check (see getExplicitCaptureAmount).
type CapturePaymentInputWithAmount = CapturePaymentInput & {
  amount?: unknown
}

describe(PaykitStripePaymentProvider, () => {
  it("validates required Stripe options", () => {
    expect(() => {
      PaykitStripePaymentProvider.validateOptions({})
    }).toThrow(
      "PayKit Stripe missing required option(s): apiKey, webhookSecret",
    )

    expect(() => {
      PaykitStripePaymentProvider.validateOptions({
        apiKey: "sk_test_123",
        webhookSecret: "whsec_123",
      })
    }).not.toThrow()
  })

  it("uses configured Stripe clients through the public payment flow", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await provider.initiatePayment({
      amount: 10.5,
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
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
        amount: 1050,
        currency: "czk",
      }),
    )
  })

  it("normalizes Medusa major-unit amounts to Stripe smallest units", async () => {
    const client = createMockPaykitClient({
      payments: {
        create: vi
          .fn<PaykitPaymentClient["payments"]["create"]>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "stripe-payment-1",
            payment_url: "https://checkout.stripe.example/session",
            status: "requires_action",
          }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.initiatePayment({
      amount: 10.5,
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
        },
      },
      currency_code: "czk",
      data: {
        item_id: "cart_123",
        provider_metadata: {
          success_url: "https://shop.example/checkout/success",
        },
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1050,
      }),
    )
    expect(result).toStrictEqual({
      data: {
        amount: 1050,
        currency: "czk",
        id: "stripe-payment-1",
        payment_url: "https://checkout.stripe.example/session",
        status: "requires_action",
      },
      id: "stripe-payment-1",
      status: PaymentSessionStatus.REQUIRES_MORE,
    })
  })

  it("normalizes three-decimal Stripe currencies to Stripe's nearest-ten smallest units", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await provider.initiatePayment({
      amount: 10.123,
      context: {
        customer: {
          email: "customer@example.com",
          id: "cus_123",
        },
      },
      currency_code: "bhd",
      data: {
        item_id: "cart_123",
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10_130,
      }),
    )
  })

  it("uses Stripe Checkout Session data as authoritative for cs ids", async () => {
    const client = createMockPaykitClient({
      payments: {
        // PayKit Stripe 1.3.2 returns this incomplete PaymentIntent-derived
        // shape and would otherwise bypass the Checkout Session mapping.
        retrieve: vi
          .fn<PaykitPaymentClient["payments"]["retrieve"]>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "cs_test_123",
            metadata: {},
            status: "succeeded",
          }),
      },
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            amount_total: 1050,
            currency: "czk",
            customer: "cus_123",
            id: "cs_test_123",
            metadata: {
              __paykit: JSON.stringify({ itemId: "cart_123" }),
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

    const result = await provider.getPaymentStatus({
      data: {
        id: "cs_test_123",
      },
    })

    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        amount: 1050,
        currency: "czk",
        customer: {
          id: "cus_123",
        },
        id: "cs_test_123",
        item_id: "cart_123",
        metadata: {
          session_id: "payses_123",
        },
        payment_intent_id: "pi_123",
        payment_url: "https://checkout.stripe.example/session",
        status: "succeeded",
      }),
    )
    expect(client.payments.retrieve).not.toHaveBeenCalled()
    expect(client.stripeCheckoutSessions?.retrieve).toHaveBeenCalledWith(
      "cs_test_123",
      { expand: ["payment_intent"] },
    )
  })

  it("delegates non-checkout payment retrieval to PayKit", async () => {
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi
          .fn<PaykitPaymentClient["payments"]["retrieve"]>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "pi_test_123",
            metadata: {
              session_id: "payses_123",
            },
            status: "succeeded",
          }),
      },
      stripeCheckoutSessions: {
        retrieve:
          vi.fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >(),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.getPaymentStatus({
      data: {
        id: "pi_test_123",
      },
    })

    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "pi_test_123",
        status: "succeeded",
      }),
    )
    expect(client.payments.retrieve).toHaveBeenCalledWith("pi_test_123")
    expect(client.stripeCheckoutSessions?.retrieve).not.toHaveBeenCalled()
  })

  it("prefers expanded Stripe PaymentIntent status for checkout sessions", async () => {
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi
          .fn<PaykitPaymentClient["payments"]["retrieve"]>()
          .mockResolvedValue(null),
      },
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            amount_total: 1050,
            currency: "czk",
            id: "cs_test_manual",
            metadata: {
              session_id: "payses_123",
            },
            payment_intent: {
              amount: 1050,
              currency: "czk",
              customer: "cus_123",
              id: "pi_manual",
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

    const result = await provider.getPaymentStatus({
      data: {
        id: "cs_test_manual",
      },
    })

    expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        requires_action: false,
        status: "requires_capture",
      }),
    )
  })

  it("marks checkout sessions requiring a payment method as requiring action", async () => {
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            amount_total: 1050,
            currency: "czk",
            id: "cs_test_payment_method",
            payment_intent: {
              id: "pi_payment_method",
              status: "requires_payment_method",
            },
            payment_status: "unpaid",
            status: "open",
          }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.getPaymentStatus({
      data: {
        id: "cs_test_payment_method",
      },
    })

    expect(result.status).toBe(PaymentSessionStatus.PENDING)
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_payment_method",
        payment_intent_id: "pi_payment_method",
        requires_action: true,
        status: "pending",
      }),
    )
  })

  it("does not fall back to lossy PayKit retrieval for a null checkout session", async () => {
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi
          .fn<PaykitPaymentClient["payments"]["retrieve"]>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "cs_test_null",
            metadata: {},
            status: "succeeded",
          }),
      },
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue(null),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getPaymentStatus({
        data: {
          id: "cs_test_null",
        },
      }),
    ).rejects.toThrow("PayKit payment cs_test_null could not be retrieved")
    expect(client.payments.retrieve).not.toHaveBeenCalled()
  })

  it("preserves PayKit's null retrieval contract for missing checkout sessions", async () => {
    const stripeError = Object.assign(new Error("No such checkout session"), {
      code: "resource_missing",
    })
    const client = createMockPaykitClient({
      payments: {
        retrieve: vi
          .fn<PaykitPaymentClient["payments"]["retrieve"]>()
          .mockResolvedValue(null),
      },
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockRejectedValue(stripeError),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getPaymentStatus({
        data: {
          id: "cs_test_missing",
        },
      }),
    ).rejects.toThrow("PayKit payment cs_test_missing could not be retrieved")
    expect(client.payments.retrieve).not.toHaveBeenCalled()
  })

  it("does not hide operational Stripe checkout retrieval errors", async () => {
    const stripeError = Object.assign(new Error("Stripe is unavailable"), {
      code: "api_connection_error",
    })
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockRejectedValue(stripeError),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getPaymentStatus({
        data: {
          id: "cs_test_unavailable",
        },
      }),
    ).rejects.toBe(stripeError)
  })

  it("does not double-normalize persisted Stripe amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await provider.capturePayment({
      data: {
        amount: 1050,
        currency: "czk",
        id: "stripe-payment-1",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("stripe-payment-1", {
      amount: 1050,
    })
  })

  it("rejects invalid persisted Stripe capture amounts before normalization", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.capturePayment({
        data: {
          amount: { invalid: true },
          currency: "czk",
          id: "stripe-payment-1",
        },
      }),
    ).rejects.toMatchObject({
      message: "PayKit stored payment amount must be numeric",
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("rejects invalid explicit Stripe capture amounts before normalization", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const input: CapturePaymentInputWithAmount = {
      amount: { invalid: true },
      data: {
        amount: 1050,
        currency: "czk",
        id: "stripe-payment-1",
      },
    }

    await expect(
      provider.capturePayment(input as CapturePaymentInput),
    ).rejects.toMatchObject({
      message: "PayKit capture amount must be numeric",
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("captures checkout-session payments by PaymentIntent id while preserving data.id", async () => {
    const client = createMockPaykitClient({
      payments: {
        capture: vi
          .fn<NonNullable<PaykitPaymentClient["payments"]["capture"]>>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "pi_manual",
            status: "succeeded",
          }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.capturePayment({
      data: {
        amount: 1050,
        currency: "czk",
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("pi_manual", {
      amount: 1050,
    })
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        status: "succeeded",
      }),
    )
  })

  it("resolves missing PaymentIntent ids from checkout sessions before capture", async () => {
    const client = createMockPaykitClient({
      payments: {
        capture: vi
          .fn<NonNullable<PaykitPaymentClient["payments"]["capture"]>>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "pi_manual",
            status: "succeeded",
          }),
      },
      stripeCheckoutSessions: {
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
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
        amount: 1050,
        currency: "czk",
        id: "cs_test_manual",
      },
    })

    expect(client.stripeCheckoutSessions?.retrieve).toHaveBeenCalledWith(
      "cs_test_manual",
      { expand: ["payment_intent"] },
    )
    expect(client.payments.capture).toHaveBeenCalledWith("pi_manual", {
      amount: 1050,
    })
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
      }),
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
        currency: "czk",
        id: "cs_test_123",
        payment_intent_id: "pi_123",
      },
    })

    expect(client.refunds?.create).toHaveBeenCalledWith({
      amount: 1050,
      metadata: null,
      payment_id: "pi_123",
      reason: null,
    })
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_123",
        payment_intent_id: "pi_123",
        refund_id: "refund-1",
      }),
    )
  })

  it("expires checkout sessions during cancel instead of canceling a PaymentIntent with cs id", async () => {
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        expire: vi
          .fn<
            NonNullable<
              NonNullable<
                PaykitPaymentClient["stripeCheckoutSessions"]
              >["expire"]
            >
          >()
          .mockResolvedValue({
            id: "cs_test_open",
            payment_status: "unpaid",
            status: "expired",
          }),
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            id: "cs_test_open",
            payment_status: "unpaid",
            status: "open",
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

    expect(client.stripeCheckoutSessions?.retrieve).toHaveBeenCalledWith(
      "cs_test_open",
      { expand: ["payment_intent"] },
    )
    expect(client.stripeCheckoutSessions?.expire).toHaveBeenCalledWith(
      "cs_test_open",
    )
    expect(client.payments.cancel).not.toHaveBeenCalled()
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_open",
        status: "canceled",
      }),
    )
  })

  it("does not expire completed paid checkout sessions during cancel", async () => {
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        expire:
          vi.fn<
            NonNullable<
              NonNullable<
                PaykitPaymentClient["stripeCheckoutSessions"]
              >["expire"]
            >
          >(),
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            amount_total: 1050,
            currency: "czk",
            id: "cs_test_paid",
            payment_intent: {
              amount: 1050,
              currency: "czk",
              id: "pi_paid",
              status: "succeeded",
            },
            payment_status: "paid",
            status: "complete",
          }),
      },
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    const result = await provider.cancelPayment({
      data: {
        id: "cs_test_paid",
      },
    })

    expect(client.stripeCheckoutSessions?.expire).not.toHaveBeenCalled()
    expect(client.payments.cancel).not.toHaveBeenCalled()
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_paid",
        payment_intent_id: "pi_paid",
        status: "succeeded",
      }),
    )
  })

  it("does not expire already-expired checkout sessions during cancel", async () => {
    const client = createMockPaykitClient({
      stripeCheckoutSessions: {
        expire:
          vi.fn<
            NonNullable<
              NonNullable<
                PaykitPaymentClient["stripeCheckoutSessions"]
              >["expire"]
            >
          >(),
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            id: "cs_test_expired",
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
        id: "cs_test_expired",
      },
    })

    expect(client.stripeCheckoutSessions?.expire).not.toHaveBeenCalled()
    expect(client.payments.cancel).not.toHaveBeenCalled()
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_expired",
        status: "canceled",
      }),
    )
  })

  it("cancels capturable PaymentIntents for completed checkout sessions", async () => {
    const client = createMockPaykitClient({
      payments: {
        cancel: vi
          .fn<NonNullable<PaykitPaymentClient["payments"]["cancel"]>>()
          .mockResolvedValue({
            amount: 1050,
            currency: "czk",
            id: "pi_manual",
            status: "canceled",
          }),
      },
      stripeCheckoutSessions: {
        expire:
          vi.fn<
            NonNullable<
              NonNullable<
                PaykitPaymentClient["stripeCheckoutSessions"]
              >["expire"]
            >
          >(),
        retrieve: vi
          .fn<
            NonNullable<
              PaykitPaymentClient["stripeCheckoutSessions"]
            >["retrieve"]
          >()
          .mockResolvedValue({
            id: "cs_test_manual",
            payment_intent: {
              amount: 1050,
              currency: "czk",
              id: "pi_manual",
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

    const result = await provider.cancelPayment({
      data: {
        id: "cs_test_manual",
      },
    })

    expect(client.stripeCheckoutSessions?.expire).not.toHaveBeenCalled()
    expect(client.payments.cancel).toHaveBeenCalledWith("pi_manual")
    expect(result.data).toStrictEqual(
      expect.objectContaining({
        id: "cs_test_manual",
        payment_intent_id: "pi_manual",
        status: "canceled",
      }),
    )
  })

  it("maps authorized Stripe webhook events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient({
      handleWebhook: vi
        .fn<NonNullable<PaykitPaymentClient["handleWebhook"]>>()
        .mockResolvedValue([
          {
            data: {
              amount: 1050,
              currency: "czk",
              id: "stripe-payment-1",
              metadata: {
                session_id: "payses_123",
              },
              status: "requires_capture",
            },
            type: "payment.updated",
          },
        ]),
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {
          "stripe-signature": "sig_123",
        },
        rawData: "",
      }),
    ).resolves.toStrictEqual({
      action: PaymentActions.AUTHORIZED,
      data: {
        amount: 10.5,
        session_id: "payses_123",
      },
    })
  })

  it("maps successful Stripe webhook events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient({
      handleWebhook: vi
        .fn<NonNullable<PaykitPaymentClient["handleWebhook"]>>()
        .mockResolvedValue([
          {
            data: {
              amount: 1050,
              currency: "czk",
              id: "stripe-payment-1",
              metadata: {
                session_id: "payses_123",
              },
              status: "succeeded",
            },
            type: "payment.succeeded",
          },
        ]),
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {
          "stripe-signature": "sig_123",
        },
        rawData: "",
      }),
    ).resolves.toStrictEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        amount: 10.5,
        session_id: "payses_123",
      },
    })
  })

  it("skips raw Stripe events before the standard payment event", async () => {
    const client = createMockPaykitClient({
      handleWebhook: vi
        .fn<NonNullable<PaykitPaymentClient["handleWebhook"]>>()
        .mockResolvedValue([
          {
            data: {
              id: "evt_123",
            },
            is_raw: true,
            type: "stripe.payment_intent.succeeded",
          },
          {
            data: {
              amount: 1050,
              currency: "czk",
              id: "stripe-payment-1",
              metadata: {
                session_id: "payses_123",
              },
              status: "succeeded",
            },
            type: "payment.succeeded",
          },
        ]),
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {
          "stripe-signature": "sig_123",
        },
        rawData: "",
      }),
    ).resolves.toStrictEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        amount: 10.5,
        session_id: "payses_123",
      },
    })
  })

  it("maps Stripe checkout invoice events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient({
      handleWebhook: vi
        .fn<NonNullable<PaykitPaymentClient["handleWebhook"]>>()
        .mockResolvedValue([
          {
            data: {
              amount_paid: 1050,
              currency: "czk",
              id: "cs_test_123",
              metadata: {
                session_id: "payses_123",
              },
            },
            type: "invoice.generated",
          },
        ]),
    })
    const provider = new PaykitStripePaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getWebhookActionAndData({
        data: {},
        headers: {
          "stripe-signature": "sig_123",
        },
        rawData: "",
      }),
    ).resolves.toStrictEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        amount: 10.5,
        session_id: "payses_123",
      },
    })
  })
})
