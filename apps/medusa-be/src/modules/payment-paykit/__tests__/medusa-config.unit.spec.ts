import { describe, expect, it } from "vitest"

import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "../constants"
import { buildPaykitPaymentProviders } from "../medusa-config"

describe(buildPaykitPaymentProviders, () => {
  it("returns no PayKit providers when disabled", () => {
    expect(buildPaykitPaymentProviders({})).toStrictEqual([])
  })

  it("builds enabled PayKit provider configs from env", () => {
    expect(
      buildPaykitPaymentProviders({
        COMGATE_MERCHANT: "merchant",
        COMGATE_PAYMENT_LABEL: "Shop order",
        COMGATE_SANDBOX: "true",
        COMGATE_SECRET: "secret",
        FEATURE_PAYKIT_COMGATE_ENABLED: "1",
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
        FEATURE_PAYKIT_STRIPE_ENABLED: "1",
        GOPAY_CLIENT_ID: "gopay-client",
        GOPAY_CLIENT_SECRET: "gopay-secret",
        GOPAY_GO_ID: "go-id",
        GOPAY_SANDBOX: "false",
        GOPAY_WEBHOOK_URL: "https://shop.example/hooks/gopay",
        PAYKIT_DEBUG: "1",
        STRIPE_API_KEY: "sk_test_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
      }),
    ).toStrictEqual([
      {
        id: PAYKIT_GOPAY_PROVIDER_ID,
        options: {
          clientId: "gopay-client",
          clientSecret: "gopay-secret",
          debug: true,
          goId: "go-id",
          isSandbox: false,
          webhookUrl: "https://shop.example/hooks/gopay",
        },
        resolve: "./src/modules/payment-paykit/services/gopay",
      },
      {
        id: PAYKIT_STRIPE_PROVIDER_ID,
        options: {
          apiKey: "sk_test_123",
          debug: true,
          webhookSecret: "whsec_123",
        },
        resolve: "./src/modules/payment-paykit/services/stripe",
      },
      {
        id: PAYKIT_COMGATE_PROVIDER_ID,
        options: {
          debug: true,
          isSandbox: true,
          merchant: "merchant",
          paymentLabel: "Shop order",
          secret: "secret",
        },
        resolve: "./src/modules/payment-paykit/services/comgate",
      },
    ])
  })

  it("throws a clear error for enabled providers with missing env", () => {
    expect(() =>
      buildPaykitPaymentProviders({
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
        GOPAY_CLIENT_ID: "gopay-client",
      }),
    ).toThrow(
      "PayKit GoPay missing required environment variable(s): GOPAY_CLIENT_SECRET, GOPAY_GO_ID, GOPAY_WEBHOOK_URL",
    )
  })
})
