import { describe, expect, it } from "vitest"
import {
  getComgateProviderOptions,
  getGopayProviderOptions,
  getStripeProviderOptions,
} from "../runtime"

describe("PayKit runtime helpers", () => {
  it("maps GoPay sandbox option to PayKit's public isSandbox option", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client",
        clientSecret: "secret",
        goId: "goid",
        sandbox: false,
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
      goId: "goid",
      isSandbox: false,
      webhookUrl: "https://example.com/hooks/gopay",
      webhookSecret: "",
      debug: false,
    })
  })

  it("maps Stripe options to PayKit's public createStripe options", () => {
    expect(
      getStripeProviderOptions({
        apiKey: "sk_test_123",
        webhookSecret: "whsec_123",
        debug: true,
      })
    ).toEqual({
      apiKey: "sk_test_123",
      webhookSecret: "whsec_123",
      debug: true,
    })
  })

  it("maps Comgate sandbox option to PayKit's public isSandbox option", () => {
    expect(
      getComgateProviderOptions({
        merchant: "merchant",
        secret: "secret",
        sandbox: false,
      })
    ).toEqual({
      merchant: "merchant",
      secret: "secret",
      isSandbox: false,
      debug: false,
    })
  })
})
