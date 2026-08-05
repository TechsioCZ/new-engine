import type { CapturePaymentInput } from "@medusajs/framework/types"
import { PaymentActions } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { PAYKIT_GOPAY_WEBHOOK_PATH } from "../constants"
import { getGopayProviderOptions } from "../runtime"
import { PaykitGopayPaymentProvider } from "../services/gopay"
import { createMockContainer, createMockPaykitClient } from "./helpers"

type CapturePaymentInputWithAmount = CapturePaymentInput & {
  amount: number
}

const makeCapturePaymentInput = (): CapturePaymentInputWithAmount => ({
  amount: 10.5,
  data: {
    currency: "czk",
    id: "gopay-payment-1",
  },
})

describe(PaykitGopayPaymentProvider, () => {
  it("normalizes Medusa major-unit amounts to GoPay smallest units", async () => {
    const client = createMockPaykitClient({
      payments: {
        create: vi.fn().mockResolvedValue({
          amount: 1050,
          currency: "czk",
          id: "gopay-payment-1",
          payment_url: "https://gw.example/gopay-payment-1",
          status: "requires_action",
        }),
      },
    })
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
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
      })
    )
  })

  it("maps GoPay return_url metadata to PayKit success_url when needed", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
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
        provider_metadata: {
          return_url: "https://shop.example/pokladna",
        },
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_metadata: {
          return_url: "https://shop.example/pokladna",
          success_url: "https://shop.example/pokladna",
        },
      })
    )
  })

  it("prefers PayKit success_url metadata over the GoPay return_url alias", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
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
        provider_metadata: {
          return_url: "https://shop.example/return",
          success_url: "https://shop.example/success",
        },
        session_id: "payses_123",
      },
    })

    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_metadata: {
          return_url: "https://shop.example/return",
          success_url: "https://shop.example/success",
        },
      })
    )
  })

  it("does not invent a GoPay return URL when payment data has none", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
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
        provider_metadata: {},
      })
    )
  })

  it("passes PayKit GoPay public option names", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client-id",
        clientSecret: "secret",
        debug: true,
        goId: "go-id",
        isSandbox: true,
        webhookUrl: "https://shop.example/gopay",
      })
    ).toStrictEqual({
      clientId: "client-id",
      clientSecret: "secret",
      debug: true,
      goId: "go-id",
      isSandbox: true,
      webhookUrl: "https://shop.example/gopay",
    })
  })

  it("does not double-normalize persisted PayKit amounts during capture", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
      client,
    })

    await provider.capturePayment({
      data: {
        amount: 1050,
        currency: "czk",
        id: "gopay-payment-1",
      },
    })

    expect(client.payments.capture).toHaveBeenCalledWith("gopay-payment-1", {
      amount: 1050,
    })
  })

  it("normalizes explicit Medusa capture amount to GoPay smallest units", async () => {
    const client = createMockPaykitClient()
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
      client,
    })

    await provider.capturePayment(makeCapturePaymentInput())

    expect(client.payments.capture).toHaveBeenCalledWith("gopay-payment-1", {
      amount: 1050,
    })
  })

  it("normalizes GoPay webhook amounts back to Medusa major units", async () => {
    const client = createMockPaykitClient()
    client.handleWebhook = vi.fn().mockResolvedValue([
      {
        data: {
          amount: 1050,
          currency: "czk",
          id: "gopay-payment-1",
          metadata: {
            session_id: "payses_123",
          },
          status: "succeeded",
        },
        type: "payment.updated",
      },
    ])
    const provider = new PaykitGopayPaymentProvider(createMockContainer(), {
      client,
    })

    await expect(
      provider.getWebhookActionAndData({
        data: {
          fullUrl: `https://shop.example${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
        },
        headers: {},
        rawData: "",
      })
    ).resolves.toStrictEqual({
      action: PaymentActions.SUCCESSFUL,
      data: {
        amount: 10.5,
        session_id: "payses_123",
      },
    })
  })
})
