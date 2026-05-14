import { describe, expect, it } from "vitest"
import {
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

  it("keeps Stripe webhook secret out of PayKit's createStripe options", () => {
    expect(
      getStripeProviderOptions({
        apiKey: "sk_test_123",
        webhookSecret: "whsec_123",
        debug: true,
      })
    ).toEqual({
      apiKey: "sk_test_123",
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
