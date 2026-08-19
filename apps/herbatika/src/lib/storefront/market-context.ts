import { defineStorefrontMarkets } from "@techsio/storefront-i18n/core/markets"
import { normalizeHost } from "@/lib/market/market-runtime-definitions"

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

type ResolveHostMarketContextInput = {
  allowDevelopmentFallback?: boolean
  host?: string | null
  hostAliases?: HerbatikaMarketHostAliases
}

type ResolveMarketRequestHostInput = {
  forwardedHost?: string | null
  host?: string | null
  trustProxyHost?: boolean
}

export type HerbatikaMarketHostAliases = Partial<
  Record<HerbatikaMarketCode, string | readonly string[] | null>
>

export const resolveMarketRequestHost = ({
  forwardedHost,
  host,
  trustProxyHost = false,
}: ResolveMarketRequestHostInput): string | null =>
  trustProxyHost ? (forwardedHost ?? host ?? null) : (host ?? null)

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
export const HERBATIKA_STOREFRONT_NAMESPACE = "herbatica"
const DEVELOPMENT_HOSTS = new Set(["127.0.0.1", "herbatika", "localhost"])
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

const normalizeConfiguredHostAlias = (value: string): string | null => {
  const normalizedHost = normalizeHost(value)
  if (normalizedHost) {
    return normalizedHost
  }

  try {
    const origin = new URL(value)
    if (
      (origin.protocol !== "http:" && origin.protocol !== "https:") ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      return null
    }

    return normalizeHost(origin.host)
  } catch {
    return null
  }
}

const resolveAliasMarketCode = (
  normalizedHost: string,
  hostAliases: HerbatikaMarketHostAliases
): HerbatikaMarketCode | null => {
  let resolvedMarketCode: HerbatikaMarketCode | null = null

  for (const marketCode of Object.keys(
    MARKET_CONFIG
  ) as HerbatikaMarketCode[]) {
    const configuredAliases = hostAliases[marketCode]
    const aliases =
      typeof configuredAliases === "string"
        ? configuredAliases.split(",")
        : (configuredAliases ?? [])
    const matchesMarket = aliases.some(
      (alias) => normalizeConfiguredHostAlias(alias) === normalizedHost
    )

    if (!matchesMarket) {
      continue
    }

    if (resolvedMarketCode && resolvedMarketCode !== marketCode) {
      return null
    }

    resolvedMarketCode = marketCode
  }

  return resolvedMarketCode
}

export const resolveHostMarketContext = ({
  allowDevelopmentFallback = false,
  host,
  hostAliases = {},
}: ResolveHostMarketContextInput = {}): HerbatikaMarketContext | null => {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) {
    return null
  }

  const canonicalMarketCode = HOST_MARKET_MAP[normalizedHost]
  const aliasMarketCode = resolveAliasMarketCode(normalizedHost, hostAliases)
  const marketCode =
    canonicalMarketCode &&
    aliasMarketCode &&
    canonicalMarketCode !== aliasMarketCode
      ? null
      : (canonicalMarketCode ?? aliasMarketCode)

  if (marketCode) {
    return getHerbatikaMarketContext(marketCode)
  }

  return allowDevelopmentFallback && DEVELOPMENT_HOSTS.has(normalizedHost)
    ? DEFAULT_MARKET_CONTEXT
    : null
}
