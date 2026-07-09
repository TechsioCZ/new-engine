export type HerbatikaMarketCode = "sk" | "cz" | "hu" | "ro"
export type HerbatikaLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type HerbatikaCountryCode = "sk" | "cz" | "hu" | "ro"

export type HerbatikaMarketContext = {
  code: HerbatikaMarketCode
  locale: HerbatikaLocale
  htmlLang: HerbatikaLocale
  countryCode: HerbatikaCountryCode
  currencyCode: string
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
    currencyCode: "EUR",
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
    currencyCode: "CZK",
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
    currencyCode: "HUF",
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
    currencyCode: "RON",
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
export const DEFAULT_MARKET_CONTEXT = MARKET_CONFIG[DEFAULT_MARKET_CODE]
export const HERBATIKA_MARKETS = Object.values(MARKET_CONFIG)

export const getHerbatikaMarketContext = (
  code: HerbatikaMarketCode
): HerbatikaMarketContext => MARKET_CONFIG[code]

export const normalizeHost = (host?: string | null) => {
  const firstHost = host?.split(",")[0]?.trim().toLowerCase()

  if (!firstHost) {
    return null
  }

  return firstHost
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
}

const resolveMarketCodeFromHost = (host?: string | null) => {
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost) {
    return null
  }

  return HOST_MARKET_MAP[normalizedHost] ?? null
}

const resolveMarketCodeFromAcceptLanguage = (
  acceptLanguage?: string | null
) => {
  if (!acceptLanguage) {
    return null
  }

  const languageItems = acceptLanguage
    .split(",")
    .map((item) => {
      const [rawTag, rawQuality] = item.trim().split(";q=")
      const quality = rawQuality ? Number.parseFloat(rawQuality) : 1

      return {
        primaryTag: rawTag?.split("-")[0]?.toLowerCase() ?? "",
        quality: Number.isFinite(quality) ? quality : 1,
      }
    })
    .filter((item) => item.primaryTag)
    .sort((left, right) => right.quality - left.quality)

  for (const item of languageItems) {
    const marketCode = LANGUAGE_MARKET_MAP[item.primaryTag]

    if (marketCode) {
      return marketCode
    }
  }

  return null
}

export const resolveMarketContext = ({
  acceptLanguage,
  host,
}: ResolveMarketContextInput = {}): HerbatikaMarketContext => {
  const marketCode =
    resolveMarketCodeFromHost(host) ??
    resolveMarketCodeFromAcceptLanguage(acceptLanguage) ??
    DEFAULT_MARKET_CODE

  return MARKET_CONFIG[marketCode]
}
