import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import {
  getHerbatikaMarketContext,
  HERBATIKA_STOREFRONT_NAMESPACE,
} from "./market-context"
import { fetchCompleteRegionList, REGION_LIST_PAGE_SIZE } from "./region-pages"
import {
  regionMatchesMarket,
  resolveRegionCurrency,
  toRegionInfo,
} from "./region-selection"

type RegionOptions = {
  countryCode?: string
  currencyCode?: string
  id?: string
  marketCode?: string
  salesChannelId?: string
  storefrontNamespace?: string
}

const DEFAULT_REGION_OPTIONS: Required<RegionOptions> = {
  countryCode: "sk",
  currencyCode: "eur",
  id: "reg_sk",
  marketCode: "sk",
  salesChannelId: "sc_sk",
  storefrontNamespace: HERBATIKA_STOREFRONT_NAMESPACE,
}

const buildRegion = (options: RegionOptions = {}): HttpTypes.StoreRegion => {
  const {
    countryCode,
    currencyCode,
    id,
    marketCode,
    salesChannelId,
    storefrontNamespace,
  } = { ...DEFAULT_REGION_OPTIONS, ...options }

  return {
    id,
    name: marketCode,
    currency_code: currencyCode,
    countries: [{ id: `country_${countryCode}`, iso_2: countryCode }],
    metadata: {
      storefront_market_code: marketCode,
      storefront_sales_channel_id: salesChannelId,
      storefront_shop_namespace: storefrontNamespace,
    },
  } as HttpTypes.StoreRegion
}

describe("Herbatica region boundaries", () => {
  it("accepts only the exact shop, market, currency, country, and Sales Channel mapping", () => {
    const marketContext = getHerbatikaMarketContext("sk")

    expect(regionMatchesMarket(buildRegion(), marketContext)).toBe(true)
    expect(
      regionMatchesMarket(
        buildRegion({ storefrontNamespace: "other-shop" }),
        marketContext
      )
    ).toBe(false)
    expect(
      regionMatchesMarket(buildRegion({ marketCode: "cz" }), marketContext)
    ).toBe(false)
    expect(
      regionMatchesMarket(buildRegion({ currencyCode: "czk" }), marketContext)
    ).toBe(false)
    expect(
      regionMatchesMarket(buildRegion({ countryCode: "cz" }), marketContext)
    ).toBe(false)
    expect(
      regionMatchesMarket(buildRegion({ salesChannelId: "" }), marketContext)
    ).toBe(false)
  })

  it("returns the mapped currency and rejects invalid configured region currency", () => {
    const region = toRegionInfo(buildRegion(), getHerbatikaMarketContext("sk"))

    expect(region).toMatchObject({
      country_code: "sk",
      currency_code: "EUR",
      region_id: "reg_sk",
      salesChannelId: "sc_sk",
    })
    expect(resolveRegionCurrency(region)).toBe("EUR")
    expect(() => resolveRegionCurrency({ region_id: "reg_invalid" })).toThrow(
      "Storefront region is missing a valid currency."
    )
    expect(resolveRegionCurrency(null)).toBe("EUR")
  })
})

describe("complete region pagination", () => {
  it("loads every Medusa page instead of relying on the default first page", async () => {
    const regions = Array.from(
      { length: REGION_LIST_PAGE_SIZE + 1 },
      (_, index) => buildRegion({ id: `reg_${index}` })
    )
    const offsets: number[] = []
    const result = await fetchCompleteRegionList(
      ({ limit = REGION_LIST_PAGE_SIZE, offset = 0 }) => {
        offsets.push(offset)

        return Promise.resolve({
          regions: regions.slice(offset, offset + limit),
          count: regions.length,
        })
      }
    )

    expect(offsets).toEqual([0, REGION_LIST_PAGE_SIZE])
    expect(result.regions).toHaveLength(REGION_LIST_PAGE_SIZE + 1)
  })
})
