import { defineStorefrontMarkets } from "@techsio/storefront-i18n/core/markets"

export type HerbaticaMarketCode = "sk" | "cz" | "hu" | "ro"
export type HerbaticaLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type HerbaticaCountryCode = "sk" | "cz" | "hu" | "ro"

export type HerbaticaMarketContext = {
  code: HerbaticaMarketCode
  locale: HerbaticaLocale
  htmlLang: HerbaticaLocale
  countryCode: HerbaticaCountryCode
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
} as const satisfies Record<HerbaticaMarketCode, HerbaticaMarketContext>

const HOST_MARKET_MAP: Record<string, HerbaticaMarketCode> = {
  "herbatica.sk": "sk",
  "www.herbatica.sk": "sk",
  "herbatica.cz": "cz",
  "www.herbatica.cz": "cz",
  "herbatica.hu": "hu",
  "www.herbatica.hu": "hu",
  "herbatica.ro": "ro",
  "www.herbatica.ro": "ro",
}

const LANGUAGE_MARKET_MAP: Record<string, HerbaticaMarketCode> = {
  cs: "cz",
  cz: "cz",
  hu: "hu",
  ro: "ro",
  sk: "sk",
}

export const DEFAULT_MARKET_CODE: HerbaticaMarketCode = "sk"
const marketResolver = defineStorefrontMarkets({
  defaultMarketCode: DEFAULT_MARKET_CODE,
  hostMarketMap: HOST_MARKET_MAP,
  languageMarketMap: LANGUAGE_MARKET_MAP,
  markets: MARKET_CONFIG,
})

export const DEFAULT_MARKET_CONTEXT = marketResolver.defaultMarket
export const HERBATICA_MARKETS = Object.values(MARKET_CONFIG)

export const getHerbaticaMarketContext = (
  code: HerbaticaMarketCode
): HerbaticaMarketContext => marketResolver.getMarket(code)

export const resolveMarketContext = ({
  acceptLanguage,
  host,
}: ResolveMarketContextInput = {}): HerbaticaMarketContext =>
  marketResolver.resolveMarket({ acceptLanguage, host })
