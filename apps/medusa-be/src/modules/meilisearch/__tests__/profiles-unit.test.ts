import { describe, expect, it } from "vitest"

import {
  readSearchProfiles,
  resolveSearchProfile,
  SearchProfileError,
} from "../profiles"
import type { SearchProfile } from "../profiles"
import { MEILISEARCH_MAX_TOTAL_HITS, PRODUCT_INDEX_SETTINGS } from "../settings"

const profile = (options: {
  domain: string
  key: string
  locale?: string
  salesChannelIds: string[]
}): SearchProfile => ({
  availability: "all",
  domain: options.domain,
  indexes: {
    brand: `brand_${options.key}`,
    category: `category_${options.key}`,
    content: `content_${options.key}`,
    product: `product_${options.key}`,
  },
  key: options.key,
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 500,
    page: 100,
    popular: 12,
  },
  locale: options.locale ?? "cs",
  minimumRankingScore: 0.55,
  salesChannelIds: options.salesChannelIds,
  separateVariantResults: false,
  shop: "shop",
  strict: false,
})

describe("Meilisearch search profiles", () => {
  it("provides an operational fallback when no profile environment exists", () => {
    const profiles = readSearchProfiles({})

    expect(profiles).toHaveLength(1)
    expect(
      resolveSearchProfile(
        { locale: "cs-CZ", salesChannelIds: ["sc_default"] },
        profiles,
      ).key,
    ).toBe("default")
  })

  it("prefers a configured profile over the operational default", () => {
    const operationalDefault: SearchProfile = {
      ...profile({
        domain: "default",
        key: "default",
        locale: "default",
        salesChannelIds: ["sc_1"],
      }),
      matchesAllLocales: true,
    }
    const configured = profile({
      domain: "retail",
      key: "retail",
      salesChannelIds: ["sc_1"],
    })

    expect(
      resolveSearchProfile({ locale: "cs-CZ", salesChannelIds: ["sc_1"] }, [
        operationalDefault,
        configured,
      ]).key,
    ).toBe("retail")
  })

  it("rejects an ambiguous Sales Channel and locale without an explicit key", () => {
    const profiles = [
      profile({ domain: "retail", key: "retail", salesChannelIds: ["sc_1"] }),
      profile({ domain: "b2b", key: "b2b", salesChannelIds: ["sc_1"] }),
    ]

    expect(() =>
      resolveSearchProfile(
        { locale: "cs-CZ", salesChannelIds: ["sc_1"] },
        profiles,
      ),
    ).toThrow(SearchProfileError)

    let resolutionFailure: unknown
    try {
      resolveSearchProfile(
        { locale: "cs-CZ", salesChannelIds: ["sc_1"] },
        profiles,
      )
    } catch (error) {
      resolutionFailure = error
    }

    if (!(resolutionFailure instanceof SearchProfileError)) {
      throw new Error("Expected SearchProfileError", {
        cause: resolutionFailure,
      })
    }

    expect(resolutionFailure.code).toBe("SEARCH_PROFILE_RESOLUTION_FAILED")
    expect(resolutionFailure.message).toContain("specify a profile key")
  })

  it("keeps the profile full-search ceiling aligned with Meilisearch", () => {
    expect(PRODUCT_INDEX_SETTINGS.pagination.maxTotalHits).toBe(
      MEILISEARCH_MAX_TOTAL_HITS,
    )
    expect(
      readSearchProfiles({
        MEILISEARCH_SEARCH_PROFILES: JSON.stringify([
          {
            domain: "default",
            limits: { fullSearch: MEILISEARCH_MAX_TOTAL_HITS },
            locale: "cs",
            salesChannelIds: ["sc_1"],
            shop: "shop",
          },
        ]),
      })[0]?.limits.fullSearch,
    ).toBe(MEILISEARCH_MAX_TOTAL_HITS)
  })
})
