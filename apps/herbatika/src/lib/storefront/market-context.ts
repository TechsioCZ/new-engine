import { defineStorefrontMarkets } from "@techsio/storefront-i18n/core/markets"

type HerbatikaMarketCode = "sk" | "cz" | "hu" | "ro"
export type HerbatikaLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
type HerbatikaCountryCode = "sk" | "cz" | "hu" | "ro"

export interface HerbatikaMarketContext {
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

interface ResolveMarketContextInput {
  acceptLanguage?: string | null
  host?: string | null
}

const MARKET_CONFIG = {
  cz: {
    code: "cz",
    countryCode: "cz",
    domain: "herbatica.cz",
    htmlLang: "cs-CZ",
    locale: "cs-CZ",
    metadata: {
      description: "Herbatica e-shop - přírodní produkty",
      title: "Herbatica",
    },
  },
  hu: {
    code: "hu",
    countryCode: "hu",
    domain: "herbatica.hu",
    htmlLang: "hu-HU",
    locale: "hu-HU",
    metadata: {
      description: "Herbatica webáruház - természetes termékek",
      title: "Herbatica",
    },
  },
  ro: {
    code: "ro",
    countryCode: "ro",
    domain: "herbatica.ro",
    htmlLang: "ro-RO",
    locale: "ro-RO",
    metadata: {
      description: "Herbatica magazin online - produse naturale",
      title: "Herbatica",
    },
  },
  sk: {
    code: "sk",
    countryCode: "sk",
    domain: "herbatica.sk",
    htmlLang: "sk-SK",
    locale: "sk-SK",
    metadata: {
      description: "Herbatica e-shop - prírodné produkty",
      title: "Herbatica",
    },
  },
} as const satisfies Record<HerbatikaMarketCode, HerbatikaMarketContext>

const HOST_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  "herbatica.cz": "cz",
  "herbatica.hu": "hu",
  "herbatica.ro": "ro",
  "herbatica.sk": "sk",
  "herbatika.cz": "cz",
  "herbatika.hu": "hu",
  "herbatika.ro": "ro",
  "herbatika.sk": "sk",
  "www.herbatica.cz": "cz",
  "www.herbatica.hu": "hu",
  "www.herbatica.ro": "ro",
  "www.herbatica.sk": "sk",
  "www.herbatika.cz": "cz",
  "www.herbatika.hu": "hu",
  "www.herbatika.ro": "ro",
  "www.herbatika.sk": "sk",
}

const LANGUAGE_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  cs: "cz",
  cz: "cz",
  hu: "hu",
  ro: "ro",
  sk: "sk",
}

const DEFAULT_MARKET_CODE: HerbatikaMarketCode = "sk"
const marketResolver = defineStorefrontMarkets({
  defaultMarketCode: DEFAULT_MARKET_CODE,
  hostMarketMap: HOST_MARKET_MAP,
  languageMarketMap: LANGUAGE_MARKET_MAP,
  markets: MARKET_CONFIG,
})

export const DEFAULT_MARKET_CONTEXT = marketResolver.defaultMarket

export const resolveMarketContext = ({
  acceptLanguage,
  host,
}: ResolveMarketContextInput = {}): HerbatikaMarketContext =>
  marketResolver.resolveMarket({
    ...(acceptLanguage === undefined ? {} : { acceptLanguage }),
    ...(host === undefined ? {} : { host }),
  })
