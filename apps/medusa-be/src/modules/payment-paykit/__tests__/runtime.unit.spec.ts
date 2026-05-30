import { describe, expect, it, vi } from "vitest"
import {
  callPaykitProviderWebhook,
  getComgateProviderOptions,
  getGopayProviderOptions,
  getPaykitPackageLoadErrorMessage,
  getStripeProviderOptions,
  getStripeWebhookOptions,
} from "../runtime"

describe("PayKit runtime helpers", () => {
  it("maps GoPay options to PayKit's public createGopay options", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client",
        clientSecret: "secret",
        goId: "goid",
        isSandbox: false,
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
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
        goId: "goid",
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
      goId: "goid",
      isSandbox: true,
      webhookUrl: "https://example.com/hooks/gopay",
      debug: false,
    })
  })

  it("omits Stripe sandbox mode until PayKit stops forwarding it to Stripe", () => {
    expect(
      getStripeProviderOptions({
        apiKey: "sk_test_123",
        isSandbox: false,
        webhookSecret: "whsec_123",
        debug: true,
      })
    ).toEqual({
      apiKey: "sk_test_123",
      debug: true,
    })
  })

  it("does not default Stripe sandbox mode because Stripe infers it from the key", () => {
    expect(
      getStripeProviderOptions({
        apiKey: "sk_test_123",
      })
    ).toEqual({
      apiKey: "sk_test_123",
      debug: false,
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

  it("calls PayKit 1.2 provider webhooks with headersAsObject and secret argument", async () => {
    const provider = {
      handleWebhook: vi.fn().mockResolvedValue([]),
    }

    await callPaykitProviderWebhook(
      provider,
      {
        data: {
          url: "/hooks/payment/paykit_stripe",
        },
        rawData: Buffer.from("webhook-body"),
        headers: {
          host: "backend.example",
          "stripe-signature": "sig_123",
          "x-forwarded-for": ["client", "proxy"],
          "x-forwarded-proto": "https",
          ignored: undefined,
        },
      },
      {
        webhookSecret: "whsec_123",
      }
    )

    expect(provider.handleWebhook).toHaveBeenCalledWith(
      {
        body: "webhook-body",
        headersAsObject: {
          host: "backend.example",
          "stripe-signature": "sig_123",
          "x-forwarded-for": "client,proxy",
          "x-forwarded-proto": "https",
        },
        fullUrl: "https://backend.example/hooks/payment/paykit_stripe",
      },
      "whsec_123"
    )
  })

  it("passes null webhook secret when a provider has no webhook secret option", async () => {
    const provider = {
      handleWebhook: vi.fn().mockResolvedValue([]),
    }

    await callPaykitProviderWebhook(provider, {
      data: {},
      rawData: "",
      headers: {},
    })

    expect(provider.handleWebhook).toHaveBeenCalledWith(
      expect.any(Object),
      null
    )
  })

  it("maps Comgate options to PayKit's public createComgate options", () => {
    expect(
      getComgateProviderOptions({
        merchant: "merchant",
        secret: "secret",
        isSandbox: false,
      })
    ).toEqual({
      merchant: "merchant",
      secret: "secret",
      isSandbox: false,
      debug: false,
    })
  })

  it("describes missing PayKit packages as install issues", () => {
    const error = Object.assign(
      new Error(
        "Cannot find package '@paykit-sdk/gopay' imported from /app/src/modules/payment-paykit/runtime.js"
      ),
      { code: "ERR_MODULE_NOT_FOUND" }
    )

    expect(getPaykitPackageLoadErrorMessage("@paykit-sdk/gopay", error)).toBe(
      "PayKit package \"@paykit-sdk/gopay\" is not installed. Install it before enabling this provider. Original error: Cannot find package '@paykit-sdk/gopay' imported from /app/src/modules/payment-paykit/runtime.js"
    )
  })

  it("describes PayKit package import failures as SDK/package issues", () => {
    const error = new SyntaxError(
      "The requested module '@paykit-sdk/core' does not provide an export named 'OAuth2TokenManager'"
    )

    expect(getPaykitPackageLoadErrorMessage("@paykit-sdk/gopay", error)).toBe(
      "PayKit package \"@paykit-sdk/gopay\" failed to load. The package is installed, but Node could not import it. This usually means the PayKit SDK packages are version-incompatible or the package build is invalid. Original error: The requested module '@paykit-sdk/core' does not provide an export named 'OAuth2TokenManager'"
    )
  })
})
