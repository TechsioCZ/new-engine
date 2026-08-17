import type { HerbatikaMarketCode } from "./market-context"

export type CmsLocale = "sk" | "cs" | "hu" | "ro"

const CMS_LOCALE_BY_MARKET = {
  sk: "sk",
  cz: "cs",
  hu: "hu",
  ro: "ro",
} as const satisfies Record<HerbatikaMarketCode, CmsLocale>

export const getCmsLocaleForMarket = (
  marketCode: HerbatikaMarketCode
): CmsLocale => CMS_LOCALE_BY_MARKET[marketCode]
