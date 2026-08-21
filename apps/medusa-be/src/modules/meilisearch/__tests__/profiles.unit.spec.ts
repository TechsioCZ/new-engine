import { describe, expect, it } from "vitest"
import {
  parseSearchProfileConfiguration,
  resolveSearchProfile,
  type SearchProfile,
  SearchProfileConfigurationError,
  SearchProfileResolutionError,
  validateSearchProfileSet,
} from "../profiles"

const MARKET_PROFILES = [
  ["sk", "sk-SK", "sc-sk"],
  ["cz", "cs-CZ", "sc-cz"],
  ["hu", "hu-HU", "sc-hu"],
  ["ro", "ro-RO", "sc-ro"],
] as const

const createProfile = ([
  key,
  locale,
  salesChannelId,
]: (typeof MARKET_PROFILES)[number]): SearchProfile =>
  parseSearchProfileConfiguration({
    domain: key,
    key,
    locale,
    salesChannelIds: [salesChannelId],
    shop: "herbatica",
  })

const rotate = <T>(values: readonly T[], offset: number): T[] => [
  ...values.slice(offset),
  ...values.slice(0, offset),
]

describe("Meilisearch search profile isolation", () => {
  it.each(
    MARKET_PROFILES
  )("rejects a %s sales channel that is also assigned to the next market", (...market) => {
    const index = MARKET_PROFILES.findIndex(([key]) => key === market[0])
    const profiles = MARKET_PROFILES.map(createProfile)
    const nextProfile = profiles[(index + 1) % profiles.length] as SearchProfile

    nextProfile.salesChannelIds = [market[2]]

    expect(() => validateSearchProfileSet(profiles)).toThrow(
      SearchProfileConfigurationError
    )
    expect(() => validateSearchProfileSet(profiles)).toThrow(
      `Meilisearch sales channel ${market[2]} is assigned to multiple search profiles`
    )
  })

  it.each([
    0, 1, 2, 3,
  ])("fails closed for ambiguous four-market channel scope rotation %i", (offset) => {
    const profiles = MARKET_PROFILES.map(createProfile)
    const salesChannelIds = rotate(
      MARKET_PROFILES.map(([, , salesChannelId]) => salesChannelId),
      offset
    )

    expect(() => resolveSearchProfile({ salesChannelIds }, profiles)).toThrow(
      SearchProfileResolutionError
    )
    expect(() => resolveSearchProfile({ salesChannelIds }, profiles)).toThrow(
      "Multiple Meilisearch profiles are assigned to this storefront Sales Channel and language: cz, hu, ro, sk"
    )
  })

  it.each(
    MARKET_PROFILES
  )("still resolves the exact %s market when one profile remains", (...market) => {
    const profiles = MARKET_PROFILES.map(createProfile)

    expect(
      resolveSearchProfile(
        { locale: market[1], salesChannelIds: [market[2]] },
        profiles
      ).key
    ).toBe(market[0])
  })
})
