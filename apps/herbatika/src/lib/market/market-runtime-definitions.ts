export const MARKET_CODES = Object.freeze(["sk", "cz", "hu", "ro"] as const)

export type MarketCode = (typeof MARKET_CODES)[number]
export type MarketLocale = "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
export type MarketCountryCode = "SK" | "CZ" | "HU" | "RO"

type MarketRouteDefinition = Readonly<{
  countryCode: MarketCountryCode
  locale: MarketLocale
  market: MarketCode
}>

export type MarketRoutingBinding = Readonly<{
  acceptedHosts: readonly string[]
  canonicalOrigin: string
  market: MarketCode
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

export type MarketRoutingRuntime = Readonly<{
  allowedMarkets: readonly MarketCode[]
  bindings: Readonly<Partial<Record<MarketCode, MarketRoutingBinding>>>
  marketByHost: Readonly<Record<string, MarketCode>>
}>

const HOST_PATTERN = /^([a-z0-9.-]+?)(?::([0-9]+))?$/
const INVALID_HOST_CHARACTER_PATTERN = /[,/@\\\s]/
const TRAILING_DOT_PATTERN = /\.$/

export const ROUTES = {
  sk: {
    countryCode: "SK",
    locale: "sk-SK",
    market: "sk",
  },
  cz: {
    countryCode: "CZ",
    locale: "cs-CZ",
    market: "cz",
  },
  hu: {
    countryCode: "HU",
    locale: "hu-HU",
    market: "hu",
  },
  ro: {
    countryCode: "RO",
    locale: "ro-RO",
    market: "ro",
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
