import { defineStorefrontMarkets } from "@techsio/storefront-i18n/core/markets"

export type HerbatikaMarketCode = "sk" | "cz" | "hu" | "ro"
export type HerbatikaLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type HerbatikaCountryCode = "sk" | "cz" | "hu" | "ro"

export type HerbatikaMarketContext = {
  code: HerbatikaMarketCode
  locale: HerbatikaLocale
  htmlLang: HerbatikaLocale
  countryCode: HerbatikaCountryCode
  domain: string
  metadata: {
    title: string
    description: string
  }
}

type ResolveMarketContextInput = {
  acceptLanguage?: string | null
  host?: string | null
}

const MARKET_CONFIG = {
  sk: {
    code: "sk",
    locale: "sk-SK",
    htmlLang: "sk-SK",
    countryCode: "sk",
    domain: "herbatica.sk",
    metadata: {
      title: "Herbatica",
      description: "Herbatica e-shop - prírodné produkty",
    },
  },
  cz: {
    code: "cz",
    locale: "cs-CZ",
    htmlLang: "cs-CZ",
    countryCode: "cz",
    domain: "herbatica.cz",
    metadata: {
      title: "Herbatica",
      description: "Herbatica e-shop - přírodní produkty",
    },
  },
  hu: {
    code: "hu",
    locale: "hu-HU",
    htmlLang: "hu-HU",
    countryCode: "hu",
    domain: "herbatica.hu",
    metadata: {
      title: "Herbatica",
      description: "Herbatica webáruház - természetes termékek",
    },
  },
  ro: {
    code: "ro",
    locale: "ro-RO",
    htmlLang: "ro-RO",
    countryCode: "ro",
    domain: "herbatica.ro",
    metadata: {
      title: "Herbatica",
      description: "Herbatica magazin online - produse naturale",
    },
  },
} as const satisfies Record<HerbatikaMarketCode, HerbatikaMarketContext>

const HOST_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  "herbatica.sk": "sk",
  "www.herbatica.sk": "sk",
  "herbatika.sk": "sk",
  "www.herbatika.sk": "sk",
  "herbatica.cz": "cz",
  "www.herbatica.cz": "cz",
  "herbatika.cz": "cz",
  "www.herbatika.cz": "cz",
  "herbatica.hu": "hu",
  "www.herbatica.hu": "hu",
  "herbatika.hu": "hu",
  "www.herbatika.hu": "hu",
  "herbatica.ro": "ro",
  "www.herbatica.ro": "ro",
  "herbatika.ro": "ro",
  "www.herbatika.ro": "ro",
}

const LANGUAGE_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  cs: "cz",
  cz: "cz",
  hu: "hu",
  ro: "ro",
  sk: "sk",
}

export const DEFAULT_MARKET_CODE: HerbatikaMarketCode = "sk"
const marketResolver = defineStorefrontMarkets({
  defaultMarketCode: DEFAULT_MARKET_CODE,
  hostMarketMap: HOST_MARKET_MAP,
  languageMarketMap: LANGUAGE_MARKET_MAP,
  markets: MARKET_CONFIG,
})

export const DEFAULT_MARKET_CONTEXT = marketResolver.defaultMarket
export const HERBATIKA_MARKETS = Object.values(MARKET_CONFIG)

export const getHerbatikaMarketContext = (
  code: HerbatikaMarketCode
): HerbatikaMarketContext => marketResolver.getMarket(code)

export const resolveMarketContext = ({
  acceptLanguage,
  host,
}: ResolveMarketContextInput = {}): HerbatikaMarketContext =>
  marketResolver.resolveMarket({ acceptLanguage, host })
