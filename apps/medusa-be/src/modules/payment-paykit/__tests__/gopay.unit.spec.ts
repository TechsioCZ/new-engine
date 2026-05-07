import { PaykitGopayPaymentProvider } from "../gopay"
import { getGopayProviderOptions } from "../runtime"
import type { PaykitPaymentClient } from "../types"

const createClient = (): PaykitPaymentClient => ({
  payments: {
    create: jest.fn().mockResolvedValue({
      id: "gopay-payment-1",
      amount: 1050,
      currency: "czk",
      status: "requires_action",
      payment_url: "https://gw.example/gopay-payment-1",
    }),
    retrieve: jest.fn(),
  },
})

describe("PaykitGopayPaymentProvider", () => {
  it("normalizes Medusa major-unit amounts to GoPay smallest units", async () => {
    const client = createClient()
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
        sandbox: true,
        webhookUrl: "https://shop.example/gopay",
        webhookSecret: "webhook-secret",
        debug: true,
      })
    ).toEqual({
      clientId: "client-id",
      clientSecret: "secret",
      goId: "go-id",
      isSandbox: true,
      webhookUrl: "https://shop.example/gopay",
      webhookSecret: "webhook-secret",
      debug: true,
    })
  })
})
