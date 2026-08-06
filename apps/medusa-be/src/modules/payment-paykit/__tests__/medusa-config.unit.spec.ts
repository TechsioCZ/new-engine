import { describe, expect, it } from "vitest"
import { INTEGRATION_CONFIG_NAMES } from "../../api-store/integration-config"
import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "../constants"
import { buildPaykitPaymentProviders } from "../medusa-config"

describe("buildPaykitPaymentProviders", () => {
  it("returns no PayKit providers when disabled", () => {
    expect(buildPaykitPaymentProviders({})).toEqual([])
  })

  it("builds enabled PayKit provider configs that read credentials from API Store at runtime", () => {
    expect(
      buildPaykitPaymentProviders({
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
        FEATURE_PAYKIT_STRIPE_ENABLED: "1",
        FEATURE_PAYKIT_COMGATE_ENABLED: "1",
        GOPAY_SANDBOX: "false",
        COMGATE_SANDBOX: "true",
        PAYKIT_DEBUG: "1",
      })
    ).toEqual([
      {
        resolve: "./src/modules/payment-paykit/services/gopay",
        id: PAYKIT_GOPAY_PROVIDER_ID,
        options: {
          apiStoreName: INTEGRATION_CONFIG_NAMES.GOPAY,
          isSandbox: false,
          debug: true,
        },
      },
      {
        resolve: "./src/modules/payment-paykit/services/stripe",
        id: PAYKIT_STRIPE_PROVIDER_ID,
        options: {
          apiStoreName: INTEGRATION_CONFIG_NAMES.STRIPE,
          debug: true,
        },
      },
      {
        resolve: "./src/modules/payment-paykit/services/comgate",
        id: PAYKIT_COMGATE_PROVIDER_ID,
        options: {
          apiStoreName: INTEGRATION_CONFIG_NAMES.COMGATE,
          isSandbox: true,
          debug: true,
        },
      },
    ])
  })

  it("keeps provider feature flags as registration gates without requiring secrets at boot", () => {
    expect(
      buildPaykitPaymentProviders({
        FEATURE_PAYKIT_GOPAY_ENABLED: "1",
      })
    ).toEqual([
      expect.objectContaining({
        id: PAYKIT_GOPAY_PROVIDER_ID,
        options: expect.objectContaining({
          apiStoreName: INTEGRATION_CONFIG_NAMES.GOPAY,
        }),
      }),
    ])
  })
})
