import { describe, expect, it } from "vitest"
import {
  getComgateProviderOptions,
  getGopayProviderOptions,
  getStripeProviderOptions,
  getStripeWebhookOptions,
} from "../runtime"

describe("PayKit runtime helpers", () => {
  it("maps GoPay options to PayKit's public createGopay options", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client",
        clientSecret: "secret",
        cloudApiKey: "cloud",
        goId: "goid",
        isSandbox: false,
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
      cloudApiKey: "cloud",
      goId: "goid",
      isSandbox: false,
      webhookUrl: "https://example.com/hooks/gopay",
      debug: false,
    })
  })

  it("defaults GoPay to sandbox mode", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client",
        clientSecret: "secret",
        cloudApiKey: undefined,
        goId: "goid",
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
      cloudApiKey: undefined,
      goId: "goid",
      isSandbox: true,
      webhookUrl: "https://example.com/hooks/gopay",
      debug: false,
    })
  })

  it("keeps Stripe webhook secret out of PayKit's createStripe options", () => {
    expect(
      getStripeProviderOptions({
        apiKey: "sk_test_123",
        cloudApiKey: "cloud",
        webhookSecret: "whsec_123",
        debug: true,
      })
    ).toEqual({
      apiKey: "sk_test_123",
      cloudApiKey: "cloud",
      debug: true,
    })
  })

  it("maps Stripe webhook secret to PayKit webhook payload options", () => {
    expect(
      getStripeWebhookOptions({
        apiKey: "sk_test_123",
        webhookSecret: "whsec_123",
      })
    ).toEqual({
      webhookSecret: "whsec_123",
    })
  })

  it("maps Comgate options to PayKit's public createComgate options", () => {
    expect(
      getComgateProviderOptions({
        cloudApiKey: "cloud",
        merchant: "merchant",
        secret: "secret",
        isSandbox: false,
      })
    ).toEqual({
      cloudApiKey: "cloud",
      merchant: "merchant",
      secret: "secret",
      isSandbox: false,
      debug: false,
    })
  })
})
