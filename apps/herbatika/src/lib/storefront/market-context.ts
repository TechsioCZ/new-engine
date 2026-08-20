import { createMarketRoutingRuntime } from "@/lib/market/market-runtime"
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
  environment?: Readonly<Record<string, string | undefined>>
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
    metadata: {
      title: "Herbatica",
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
  const normalizedHost = normalizeHost(host)
  if (normalizedHost) {
    try {
      const runtime = createMarketRoutingRuntime(environment)
      const market = runtime.marketByHost[normalizedHost]
      const binding = market ? runtime.bindings[market] : undefined
      if (binding) {
        return getHerbatikaMarketContext(
          binding.market,
          new URL(binding.canonicalOrigin).hostname
        )
      }
    } catch {
      // The server boundary rejects invalid host authority. This pure resolver
      // may still use language fallback for non-request consumers.
    }
  }

  const language = acceptLanguage
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase()
    .split("-", 1)[0]
  const market = language ? LANGUAGE_MARKET_MAP[language] : undefined
  return getHerbatikaMarketContext(market ?? DEFAULT_MARKET_CODE)
}
