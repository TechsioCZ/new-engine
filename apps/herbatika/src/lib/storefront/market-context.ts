import { createMarketRoutingRuntime } from "@/lib/market/market-runtime"
import {
  isMarketCode,
  normalizeHost,
} from "@/lib/market/market-runtime-definitions"

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
  environment?: Readonly<Record<string, string | undefined>>
  host?: string | null
}

type ResolveMarketRequestContextInput = {
  environment?: Readonly<Record<string, string | undefined>>
  forwardedHost?: string | null
  host?: string | null
  trustedCanonicalOrigin?: string | null
  trustedMarket?: string | null
}

export const resolveMarketRequestHost = ({
  forwardedHost,
  host,
}: {
  forwardedHost?: string | null
  host?: string | null
}) => host ?? forwardedHost ?? undefined

export const resolveMarketRequestContext = ({
  environment = process.env,
  forwardedHost,
  host,
  trustedCanonicalOrigin,
  trustedMarket,
}: ResolveMarketRequestContextInput): HerbatikaMarketContext | null => {
  try {
    const runtime = createMarketRoutingRuntime(environment)
    const hasTrustedContext =
      trustedCanonicalOrigin != null || trustedMarket != null

    if (hasTrustedContext) {
      if (!(trustedMarket && isMarketCode(trustedMarket))) {
        return null
      }
      const binding = runtime.bindings[trustedMarket]
      if (
        !(binding && trustedCanonicalOrigin) ||
        binding.canonicalOrigin !== trustedCanonicalOrigin
      ) {
        return null
      }
      return getHerbatikaMarketContext(
        binding.market,
        new URL(binding.canonicalOrigin).hostname
      )
    }

    const normalizedHost = normalizeHost(
      resolveMarketRequestHost({ forwardedHost, host })
    )
    const market = normalizedHost
      ? runtime.marketByHost[normalizedHost]
      : undefined
    const binding = market ? runtime.bindings[market] : undefined
    return binding
      ? getHerbatikaMarketContext(
          binding.market,
          new URL(binding.canonicalOrigin).hostname
        )
      : null
  } catch {
    return null
  }
}

const MARKET_CONFIG = {
  sk: {
    code: "sk",
    locale: "sk-SK",
    htmlLang: "sk-SK",
    countryCode: "sk",
    currencyCode: "EUR",
    metadata: {
      title: "Herbatica.sk",
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
    metadata: {
      title: "Herbatica.cz",
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
    metadata: {
      title: "Herbatica.hu",
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
    metadata: {
      title: "Herbatica.ro",
      description: "Herbatica magazin online - produse naturale",
    },
    timeZone: "Europe/Bucharest",
  },
} as const satisfies Record<
  HerbatikaMarketCode,
  Omit<HerbatikaMarketContext, "domain">
>

const LANGUAGE_MARKET_MAP: Record<string, HerbatikaMarketCode> = {
  cs: "cz",
  cz: "cz",
  hu: "hu",
  ro: "ro",
  sk: "sk",
}

export const DEFAULT_MARKET_CODE: HerbatikaMarketCode = "sk"

export const getHerbatikaMarketContext = (
  code: HerbatikaMarketCode,
  domain = ""
): HerbatikaMarketContext => ({ ...MARKET_CONFIG[code], domain })

export const DEFAULT_MARKET_CONTEXT =
  getHerbatikaMarketContext(DEFAULT_MARKET_CODE)
export const HERBATIKA_MARKETS = Object.keys(MARKET_CONFIG).map((market) =>
  getHerbatikaMarketContext(market as HerbatikaMarketCode)
)

export const resolveMarketContext = ({
  acceptLanguage,
  environment = process.env,
  host,
}: ResolveMarketContextInput = {}): HerbatikaMarketContext => {
  const requestContext = resolveMarketRequestContext({ environment, host })
  if (requestContext) {
    return requestContext
  }

  const language = acceptLanguage
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase()
    .split("-", 1)[0]
  const market = language ? LANGUAGE_MARKET_MAP[language] : undefined
  return getHerbatikaMarketContext(market ?? DEFAULT_MARKET_CODE)
}
