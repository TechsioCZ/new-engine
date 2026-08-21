import { describe, expect, it, vi } from "vitest"
import {
  assertHerbaticaPaymentSeedInput,
  assertHerbaticaPaymentSeedSnapshot,
  type HerbaticaPaymentSeedSnapshot,
  verifyHerbaticaPaymentSeedResult,
} from "../../../../src/scripts/herbatica-payment-seed"

const COD_PROVIDER_ID = "pp_cash_on_delivery_default"

const marketRegions = [
  { countryCodes: ["sk"], currencyCode: "eur", id: "reg_sk" },
  { countryCodes: ["cz"], currencyCode: "czk", id: "reg_cz" },
  { countryCodes: ["hu"], currencyCode: "huf", id: "reg_hu" },
  { countryCodes: ["ro"], currencyCode: "ron", id: "reg_ro" },
]

const validSnapshot = (): HerbaticaPaymentSeedSnapshot => ({
  enabledPaymentProviderIds: [COD_PROVIDER_ID],
  regions: marketRegions.map((region) => ({
    ...region,
    paymentProviderIds: [COD_PROVIDER_ID],
  })),
  shippingOptions: [
    {
      data: { code: "standard_cod", supports_cod: true },
      id: "so_standard",
      name: "Standard Shipping",
    },
    {
      data: { code: "express_cod", supports_cod: true },
      id: "so_express",
      name: "Express Shipping",
    },
  ],
})

describe("Herbatica four-market payment seed contract", () => {
  it("accepts an enabled real provider compatible with every seeded shipping option", () => {
    expect(() =>
      assertHerbaticaPaymentSeedSnapshot(validSnapshot())
    ).not.toThrow()
  })

  it("rejects the system-default fallback for address delivery", () => {
    const snapshot = validSnapshot()
    snapshot.enabledPaymentProviderIds = ["pp_system_default"]
    snapshot.regions = snapshot.regions.map((region) => ({
      ...region,
      paymentProviderIds: ["pp_system_default"],
    }))

    expect(() => assertHerbaticaPaymentSeedSnapshot(snapshot)).toThrow(
      "unique enabled non-system payment providers"
    )
  })

  it("rejects a disabled or unregistered configured provider", () => {
    const snapshot = validSnapshot()
    snapshot.enabledPaymentProviderIds = []

    expect(() => assertHerbaticaPaymentSeedSnapshot(snapshot)).toThrow(
      "SK region requires enabled non-system payment providers"
    )
  })

  it("rejects a shipping option without any region-compatible provider", () => {
    const snapshot = validSnapshot()
    snapshot.shippingOptions[0] = {
      data: { code: "card_only" },
      id: "so_standard",
      name: "Standard Shipping",
    }

    expect(() => assertHerbaticaPaymentSeedSnapshot(snapshot)).toThrow(
      'shipping option "Standard Shipping" has no compatible payment provider for EUR'
    )
  })

  it("fails preflight when a four-market region omits explicit providers", () => {
    expect(() =>
      assertHerbaticaPaymentSeedInput({
        regions: marketRegions.map((region) => ({
          countries: region.countryCodes,
          currencyCode: region.currencyCode,
          paymentProviders:
            region.currencyCode === "ron" ? undefined : [COD_PROVIDER_ID],
        })),
        shippingOptions: validSnapshot().shippingOptions,
      })
    ).toThrow("RO region requires enabled non-system payment providers")
  })

  it("verifies the persisted post-seed provider, region links, and shipping metadata", async () => {
    const snapshot = validSnapshot()
    const graph = vi.fn(async ({ entity }: { entity: string }) => {
      if (entity === "region") {
        return {
          data: snapshot.regions.map((region) => ({
            countries: region.countryCodes.map((iso_2) => ({ iso_2 })),
            currency_code: region.currencyCode,
            id: region.id,
            payment_providers: region.paymentProviderIds.map((id) => ({ id })),
          })),
        }
      }
      if (entity === "shipping_option") {
        return { data: snapshot.shippingOptions }
      }
      if (entity === "payment_provider") {
        return {
          data: snapshot.enabledPaymentProviderIds.map((id) => ({
            id,
            is_enabled: true,
          })),
        }
      }
      throw new Error(`Unexpected entity ${entity}`)
    })
    const container = {
      resolve: vi.fn(() => ({ graph })),
    }

    await expect(
      verifyHerbaticaPaymentSeedResult({
        container: container as never,
        regionIds: snapshot.regions.map(({ id }) => id),
        shippingOptionIds: snapshot.shippingOptions.map(({ id }) => id),
      })
    ).resolves.toEqual(snapshot)
    expect(graph).toHaveBeenCalledTimes(3)
  })

  it("fails the post-seed contract when persisted provider registration is disabled", async () => {
    const snapshot = validSnapshot()
    const graph = vi.fn(async ({ entity }: { entity: string }) => {
      if (entity === "region") {
        return {
          data: snapshot.regions.map((region) => ({
            countries: region.countryCodes.map((iso_2) => ({ iso_2 })),
            currency_code: region.currencyCode,
            id: region.id,
            payment_providers: region.paymentProviderIds.map((id) => ({ id })),
          })),
        }
      }
      if (entity === "shipping_option") {
        return { data: snapshot.shippingOptions }
      }
      return { data: [{ id: COD_PROVIDER_ID, is_enabled: false }] }
    })

    await expect(
      verifyHerbaticaPaymentSeedResult({
        container: { resolve: () => ({ graph }) } as never,
        regionIds: snapshot.regions.map(({ id }) => id),
        shippingOptionIds: snapshot.shippingOptions.map(({ id }) => id),
      })
    ).rejects.toThrow("SK region requires enabled non-system payment providers")
  })
})
