import { describe, expect, it } from "vitest"
import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "../config"
import { buildPaykitPaymentProviders } from "../medusa-config"

describe("buildPaykitPaymentProviders", () => {
  it("returns no PayKit providers when disabled", () => {
    expect(buildPaykitPaymentProviders({})).toEqual([])
  })

  it("builds enabled PayKit provider configs from env", () => {
    expect(
      buildPaykitPaymentProviders({
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
        FEATURE_PAYKIT_STRIPE_ENABLED: "1",
        FEATURE_PAYKIT_COMGATE_ENABLED: "1",
        GOPAY_CLIENT_ID: "gopay-client",
        GOPAY_CLIENT_SECRET: "gopay-secret",
        GOPAY_GO_ID: "go-id",
        GOPAY_SANDBOX: "false",
        GOPAY_WEBHOOK_URL: "https://shop.example/hooks/gopay",
        STRIPE_API_KEY: "sk_test_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
        COMGATE_MERCHANT: "merchant",
        COMGATE_SECRET: "secret",
        COMGATE_SANDBOX: "true",
        COMGATE_PAYMENT_LABEL: "Shop order",
        PAYKIT_CLOUD_API_KEY: "cloud-key",
        PAYKIT_DEBUG: "1",
      })
    ).toEqual([
      {
        resolve: "./src/modules/payment-paykit/services/gopay",
        id: PAYKIT_GOPAY_PROVIDER_ID,
        options: {
          clientId: "gopay-client",
          clientSecret: "gopay-secret",
          cloudApiKey: "cloud-key",
          goId: "go-id",
          isSandbox: false,
          webhookUrl: "https://shop.example/hooks/gopay",
          debug: true,
        },
      },
      {
        resolve: "./src/modules/payment-paykit/services/stripe",
        id: PAYKIT_STRIPE_PROVIDER_ID,
        options: {
          apiKey: "sk_test_123",
          cloudApiKey: "cloud-key",
          webhookSecret: "whsec_123",
          debug: true,
        },
      },
      {
        resolve: "./src/modules/payment-paykit/services/comgate",
        id: PAYKIT_COMGATE_PROVIDER_ID,
        options: {
          cloudApiKey: "cloud-key",
          merchant: "merchant",
          secret: "secret",
          isSandbox: true,
          paymentLabel: "Shop order",
          debug: true,
        },
      },
    ])
  })

  it("throws a clear error for enabled providers with missing env", () => {
    expect(() =>
      buildPaykitPaymentProviders({
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
        GOPAY_CLIENT_ID: "gopay-client",
      })
    ).toThrow(
      "PayKit GoPay missing required environment variable(s): GOPAY_CLIENT_SECRET, GOPAY_GO_ID, GOPAY_WEBHOOK_URL"
    )
  })
})
