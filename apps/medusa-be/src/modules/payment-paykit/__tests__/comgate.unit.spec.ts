import { PaymentActions } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PaykitComgatePaymentProvider } from "../comgate"
import { createMockPaykitClient } from "./helpers"

describe("PaykitComgatePaymentProvider", () => {
  it("validates required Comgate options", () => {
    expect(() => PaykitComgatePaymentProvider.validateOptions({})).toThrow(
      "PayKit Comgate missing required option(s): merchant, secret"
    )

    expect(() =>
      PaykitComgatePaymentProvider.validateOptions({
        merchant: "merchant",
        secret: "secret",
      })
    ).not.toThrow()
  })

  it("normalizes Medusa major-unit amounts and injects Comgate metadata", async () => {
    const client = createMockPaykitClient({
      payments: {
        create: vi.fn().mockResolvedValue({
          id: "comgate-payment-1",
          amount: 1050,
          currency: "czk",
          status: "pending",
        }),
      },
    })
    const provider = new PaykitComgatePaymentProvider({} as any, { client })

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
        customer: "customer@example.com",
        provider_metadata: {
          email: "customer@example.com",
          paymentLabel: "Order from Eshop",
        },
      })
    )
  })

  it("does not double-normalize persisted Comgate amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitComgatePaymentProvider({} as any, { client })

    await provider.capturePayment({
      data: {
        id: "comgate-payment-1",
        amount: 1050,
        currency: "czk",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("comgate-payment-1", {
      amount: 1050,
    })
  })

  it("maps successful Comgate webhook events with Medusa major-unit amount", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.updated",
        data: {
          id: "comgate-payment-1",
          amount: 1050,
          currency: "czk",
          status: "succeeded",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = new PaykitComgatePaymentProvider({} as any, { client })

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
        amount: 10.5,
      },
    })
  })
})
