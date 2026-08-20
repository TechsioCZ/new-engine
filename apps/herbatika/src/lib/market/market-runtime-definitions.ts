export const MARKET_CODES = Object.freeze(["sk", "cz", "hu", "ro"] as const)

export type MarketCode = (typeof MARKET_CODES)[number]
export type MarketLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type MarketCountryCode = "SK" | "CZ" | "HU" | "RO"

type MarketRouteDefinition = Readonly<{
  canonicalOrigin: string
  countryCode: MarketCountryCode
  locale: MarketLocale
  market: MarketCode
  proposedAliases: readonly string[]
}>

export type MarketRuntimeBinding = Readonly<{
  acceptedHosts: readonly string[]
  canonicalOrigin: string
  countryCode: MarketCountryCode
  locale: MarketLocale
  market: MarketCode
  publishableApiKey: string
  publishableApiKeyId: string
  regionId: string
  salesChannelId: string
}>

export type MarketRuntimeEnvironment = Readonly<
  Record<string, string | undefined>
>

export type MarketRuntime = Readonly<{
  allowedMarkets: readonly MarketCode[]
  bindings: Readonly<Partial<Record<MarketCode, MarketRuntimeBinding>>>
  marketByHost: Readonly<Record<string, MarketCode>>
}>

const HOST_PATTERN = /^([a-z0-9.-]+?)(?::([0-9]+))?$/
const INVALID_HOST_CHARACTER_PATTERN = /[,/@\\\s]/
const TRAILING_DOT_PATTERN = /\.$/

export const ROUTES = {
  sk: {
    canonicalOrigin: "https://herbatica.sk",
    countryCode: "SK",
    locale: "sk-SK",
    market: "sk",
    proposedAliases: [
      "www.herbatica.sk",
      "test-engine-herbatika-zane.web-revolution.cz",
    ],
  },
  cz: {
    canonicalOrigin: "https://herbatica.cz",
    countryCode: "CZ",
    locale: "cs-CZ",
    market: "cz",
    proposedAliases: ["www.herbatica.cz"],
  },
  hu: {
    canonicalOrigin: "https://herbatica.hu",
    countryCode: "HU",
    locale: "hu-HU",
    market: "hu",
    proposedAliases: ["www.herbatica.hu"],
  },
  ro: {
    canonicalOrigin: "https://herbatica.ro",
    countryCode: "RO",
    locale: "ro-RO",
    market: "ro",
    proposedAliases: [
      "www.herbatica.ro",
      "test-engine-herbatika-ro-zane.web-revolution.cz",
    ],
  },
} as const satisfies Record<MarketCode, MarketRouteDefinition>

export const isMarketCode = (value: string): value is MarketCode =>
  MARKET_CODES.some((market) => market === value)

export const normalizeHost = (
  value: string | null | undefined
): string | null => {
  const candidate = value?.trim().toLowerCase()
  if (!candidate || INVALID_HOST_CHARACTER_PATTERN.test(candidate)) {
    return null
  }

  const match = HOST_PATTERN.exec(candidate)
  if (!match) {
    return null
  }
  if (match[2]) {
    const port = Number(match[2])
    if (!(Number.isInteger(port) && port >= 1 && port <= 65_535)) {
      return null
    }
  }

  const hostname = match[1].replace(TRAILING_DOT_PATTERN, "")
  return hostname && !hostname.includes("..") ? hostname : null
}

const buildDeclaredHostOwnership = (): Readonly<Record<string, MarketCode>> => {
  const ownership: Record<string, MarketCode> = {}

  for (const market of MARKET_CODES) {
    const route = ROUTES[market]
    const origin = new URL(route.canonicalOrigin)
    if (
      origin.protocol !== "https:" ||
      origin.origin !== route.canonicalOrigin
    ) {
      throw new Error(`Invalid canonicalOrigin for market ${market}`)
    }

    for (const host of [origin.hostname, ...route.proposedAliases]) {
      const normalizedHost = normalizeHost(host)
      if (!normalizedHost || normalizedHost !== host) {
        throw new Error(`Invalid accepted host for market ${market}`)
      }
      const existingMarket = ownership[normalizedHost]
      if (existingMarket) {
        throw new Error(
          `Host ${normalizedHost} is assigned to both ${existingMarket} and ${market}`
        )
      }
      ownership[normalizedHost] = market
    }
  }

  return Object.freeze(ownership)
}

export const DECLARED_HOST_OWNERSHIP = buildDeclaredHostOwnership()
