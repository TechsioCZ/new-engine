import { describe, expect, it } from "vitest"
import type { SearchProfileDTO } from "../../../../../src/modules/search-profile"
import {
  FOUR_MARKET_SEARCH_PROFILE_CONTRACT,
  planFourMarketSearchProfileReconciliation,
} from "../../../../../src/workflows/search-profile/steps/reconcile-four-market-search-profiles"

const CHANNEL_NAMES = {
  sk: "Herbatica Storefront SK",
  cz: "Herbatica Storefront CZ",
  hu: "Herbatica Storefront HU",
  ro: "Herbatica Storefront RO",
} as const

const salesChannels = FOUR_MARKET_SEARCH_PROFILE_CONTRACT.map((contract) => ({
  id: `sc_${contract.marketCode}`,
  name: CHANNEL_NAMES[contract.marketCode],
  metadata: {
    seed_handle: contract.salesChannelSeedHandle,
    herbatica_market: {
      country_code: contract.marketCode,
      currency_code: contract.currencyCode,
      market_code: contract.marketCode,
      region_name: "Test",
      seed_handle: contract.salesChannelSeedHandle,
    },
    storefront_notification_markets: {
      [contract.marketCode]: {
        country_code: contract.marketCode,
        locale: contract.locale,
        market_code: contract.marketCode,
        store_name: "Herbatica",
        storefront_domain: contract.domain,
      },
    },
  },
}))

const persistedProfile = (
  marketCode: (typeof FOUR_MARKET_SEARCH_PROFILE_CONTRACT)[number]["marketCode"],
  overrides: Partial<SearchProfileDTO> = {}
): SearchProfileDTO => {
  const contract = FOUR_MARKET_SEARCH_PROFILE_CONTRACT.find(
    (candidate) => candidate.marketCode === marketCode
  )
  if (!contract) {
    throw new Error(`Missing test contract for ${marketCode}`)
  }
  return {
    id: `sp_${marketCode}`,
    key: contract.key,
    shop: "herbatica",
    domain: contract.domain,
    locale: contract.locale,
    sales_channel_ids: [`sc_${marketCode}`],
    strict: true,
    separate_variant_results: false,
    minimum_ranking_score: null,
    availability: "in-stock",
    autocomplete_product_limit: 6,
    autocomplete_category_limit: 3,
    autocomplete_brand_limit: 3,
    autocomplete_content_limit: 3,
    full_search_limit: 500,
    max_results_per_page: 100,
    popular_limit: 12,
    last_sync_status: "never",
    last_sync_mode: null,
    last_sync_started_at: null,
    last_synced_at: null,
    last_sync_error: null,
    last_indexed_count: 0,
    last_deleted_count: 0,
    created_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-21T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  }
}

describe("four-market SearchProfile bootstrap", () => {
  it("defines the exact SK/CZ/HU/RO locale, currency, and hostname contract", () => {
    expect(FOUR_MARKET_SEARCH_PROFILE_CONTRACT).toEqual([
      expect.objectContaining({
        marketCode: "sk",
        locale: "sk-SK",
        currencyCode: "eur",
        domain: "herbatica.sk",
      }),
      expect.objectContaining({
        marketCode: "cz",
        locale: "cs-CZ",
        currencyCode: "czk",
        domain: "herbatica.cz",
      }),
      expect.objectContaining({
        marketCode: "hu",
        locale: "hu-HU",
        currencyCode: "huf",
        domain: "herbatica.hu",
      }),
      expect.objectContaining({
        marketCode: "ro",
        locale: "ro-RO",
        currencyCode: "ron",
        domain: "herbatica.ro",
      }),
    ])
  })

  it("creates one strict profile with one exclusive Sales Channel per market", () => {
    const plan = planFourMarketSearchProfileReconciliation(salesChannels, [])

    expect(plan.updates).toEqual([])
    expect(plan.creates).toHaveLength(4)
    expect(
      plan.creates.map((profile) => ({
        key: profile.key,
        locale: profile.locale,
        domain: profile.domain,
        salesChannelIds: profile.sales_channel_ids,
        strict: profile.strict,
      }))
    ).toEqual([
      {
        key: "herbatica-sk",
        locale: "sk-SK",
        domain: "herbatica.sk",
        salesChannelIds: ["sc_sk"],
        strict: true,
      },
      {
        key: "herbatica-cz",
        locale: "cs-CZ",
        domain: "herbatica.cz",
        salesChannelIds: ["sc_cz"],
        strict: true,
      },
      {
        key: "herbatica-hu",
        locale: "hu-HU",
        domain: "herbatica.hu",
        salesChannelIds: ["sc_hu"],
        strict: true,
      },
      {
        key: "herbatica-ro",
        locale: "ro-RO",
        domain: "herbatica.ro",
        salesChannelIds: ["sc_ro"],
        strict: true,
      },
    ])
  })

  it("is a no-op after the exact state already exists", () => {
    const profiles = (["sk", "cz", "hu", "ro"] as const).map((market) =>
      persistedProfile(market)
    )
    const plan = planFourMarketSearchProfileReconciliation(
      salesChannels,
      profiles
    )

    expect(plan.creates).toEqual([])
    expect(plan.updates).toEqual([])
    expect(plan.unchangedProfileIds).toEqual([
      "sp_sk",
      "sp_cz",
      "sp_hu",
      "sp_ro",
    ])
  })

  it("repairs normalized legacy scope and removes claimed channels from stale profiles", () => {
    const plan = planFourMarketSearchProfileReconciliation(salesChannels, [
      persistedProfile("sk", {
        domain: "herbatica-sk",
        key: "legacy-sk",
        locale: "sk-sk",
        strict: false,
      }),
      persistedProfile("cz"),
      persistedProfile("hu"),
      persistedProfile("ro"),
      persistedProfile("ro", {
        id: "sp_stale",
        key: "legacy-shared",
        shop: "legacy",
        domain: "legacy.example",
        locale: "en",
        sales_channel_ids: ["sc_ro", "sc_unrelated"],
      }),
    ])

    expect(plan.creates).toEqual([])
    expect(plan.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sp_sk",
          next: expect.objectContaining({
            key: "herbatica-sk",
            locale: "sk-SK",
            domain: "herbatica.sk",
            sales_channel_ids: ["sc_sk"],
            strict: true,
          }),
        }),
        expect.objectContaining({
          id: "sp_stale",
          next: expect.objectContaining({
            sales_channel_ids: ["sc_unrelated"],
          }),
        }),
      ])
    )
  })

  it("rejects a channel whose currency authority drifts", () => {
    const invalidChannels = salesChannels.map((channel) =>
      channel.id === "sc_hu"
        ? {
            ...channel,
            metadata: {
              ...channel.metadata,
              herbatica_market: {
                ...channel.metadata.herbatica_market,
                currency_code: "eur",
              },
            },
          }
        : channel
    )

    expect(() =>
      planFourMarketSearchProfileReconciliation(invalidChannels, [])
    ).toThrow("currency_code must equal huf")
  })

  it("rejects ambiguous profile identity instead of leaking a market binding", () => {
    expect(() =>
      planFourMarketSearchProfileReconciliation(salesChannels, [
        persistedProfile("sk"),
        persistedProfile("sk", {
          id: "sp_sk_duplicate",
          key: "different-key",
        }),
      ])
    ).toThrow("Ambiguous SearchProfile identity for herbatica-sk")
  })
})
