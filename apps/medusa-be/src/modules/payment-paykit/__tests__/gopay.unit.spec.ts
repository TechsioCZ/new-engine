import { PaymentActions } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PAYKIT_GOPAY_WEBHOOK_PATH } from "../config"
import { PaykitGopayPaymentProvider } from "../gopay"
import { getGopayProviderOptions } from "../runtime"
import { createMockPaykitClient } from "./helpers"

describe("PaykitGopayPaymentProvider", () => {
  it("normalizes Medusa major-unit amounts to GoPay smallest units", async () => {
    const client = createMockPaykitClient({
      payments: {
        create: vi.fn().mockResolvedValue({
          id: "gopay-payment-1",
          amount: 1050,
          currency: "czk",
          status: "requires_action",
          payment_url: "https://gw.example/gopay-payment-1",
        }),
      },
    })
    const provider = new PaykitGopayPaymentProvider({} as any, { client })

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
      })
    )
  })

  it("passes PayKit GoPay public option names", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client-id",
        clientSecret: "secret",
        goId: "go-id",
        isSandbox: true,
        webhookUrl: "https://shop.example/gopay",
        debug: true,
      })
    ).toEqual({
      clientId: "client-id",
      clientSecret: "secret",
      goId: "go-id",
      isSandbox: true,
      webhookUrl: "https://shop.example/gopay",
      debug: true,
    })
  })

  it("does not double-normalize persisted PayKit amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider({} as any, { client })

    await provider.capturePayment({
      data: {
        id: "gopay-payment-1",
        amount: 1050,
        currency: "czk",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("gopay-payment-1", {
      amount: 1050,
    })
  })

  it("normalizes explicit Medusa capture amount to GoPay smallest units", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider({} as any, { client })

    await provider.capturePayment({
      amount: 10.5,
      data: {
        id: "gopay-payment-1",
        currency: "czk",
      },
    } as any)

    expect(client.payments.capture).toHaveBeenCalledWith("gopay-payment-1", {
      amount: 1050,
    })
  })

  it("normalizes GoPay webhook amounts back to Medusa major units", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        type: "payment.updated",
        data: {
          id: "gopay-payment-1",
          amount: 1050,
          currency: "czk",
          status: "succeeded",
          metadata: {
            session_id: "payses_123",
          },
        },
      },
    ])
    const provider = new PaykitGopayPaymentProvider({} as any, { client })

    await expect(
      provider.getWebhookActionAndData({
        data: {
          fullUrl: `https://shop.example${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
        },
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
