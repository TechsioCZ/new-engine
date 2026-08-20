import { defineStorefrontMarkets } from "@techsio/storefront-i18n/core/markets"

export type HerbatikaMarketCode = "sk" | "cz" | "hu" | "ro"
export type HerbatikaLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type HerbatikaCountryCode = "sk" | "cz" | "hu" | "ro"
export type HerbatikaCurrencyCode = "CZK" | "EUR" | "HUF" | "RON"

export type HerbatikaMarketContext = {
  code: HerbatikaMarketCode
  locale: HerbatikaLocale
  htmlLang: HerbatikaLocale
  countryCode: HerbatikaCountryCode
  currencyCode: HerbatikaCurrencyCode
  domain: string
  metadata: {
    title: string
    description: string
  }
  timeZone: string
}

type ResolveMarketContextInput = {
  acceptLanguage?: string | null
  host?: string | null
}

export const resolveMarketRequestHost = ({
  forwardedHost,
  host,
}: {
  forwardedHost?: string | null
  host?: string | null
}) => host ?? forwardedHost ?? undefined

const MARKET_CONFIG = {
  sk: {
    code: "sk",
    locale: "sk-SK",
    htmlLang: "sk-SK",
    countryCode: "sk",
    currencyCode: "EUR",
    domain: "herbatica.sk",
    metadata: {
      title: "Herbatica",
      description: "Herbatica e-shop - prírodné produkty",
    },
    timeZone: "Europe/Bratislava",
  },
  cz: {
    code: "cz",
    locale: "cs-CZ",
    htmlLang: "cs-CZ",
    countryCode: "cz",
    currencyCode: "CZK",
    domain: "herbatica.cz",
    metadata: {
      title: "Herbatica",
      description: "Herbatica e-shop - přírodní produkty",
    },
    timeZone: "Europe/Prague",
  },
  hu: {
    code: "hu",
    locale: "hu-HU",
    htmlLang: "hu-HU",
    countryCode: "hu",
    currencyCode: "HUF",
    domain: "herbatica.hu",
    metadata: {
      title: "Herbatica",
      description: "Herbatica webáruház - természetes termékek",
    },
    timeZone: "Europe/Budapest",
  },
  ro: {
    code: "ro",
    locale: "ro-RO",
    htmlLang: "ro-RO",
    countryCode: "ro",
    currencyCode: "RON",
    domain: "herbatica.ro",
    metadata: {
      title: "Herbatica",
      description: "Herbatica magazin online - produse naturale",
    },
    timeZone: "Europe/Bucharest",
  },
} as const satisfies Record<HerbatikaMarketCode, HerbatikaMarketContext>

const HOST_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  "herbatica.sk": "sk",
  "www.herbatica.sk": "sk",
  "herbatika.sk": "sk",
  "www.herbatika.sk": "sk",
  "test-engine-herbatika-zane.web-revolution.cz": "sk",
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
  "test-engine-herbatika-ro-zane.web-revolution.cz": "ro",
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
