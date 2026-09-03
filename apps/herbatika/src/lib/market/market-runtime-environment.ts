import {
  isMarketCode,
  MARKET_CODES,
  type MarketCode,
  type MarketRoutingBinding,
  type MarketRuntimeBinding,
  type MarketRuntimeEnvironment,
  normalizeHost,
} from "./market-runtime-definitions"

const MULTIPLE_VALUE_PATTERN = /[,\s]/

export const readRequiredValue = (
  environment: MarketRuntimeEnvironment,
  environmentName: string
): string => {
  const value = environment[environmentName]?.trim()
  if (!value) {
    throw new Error(
      `Missing server runtime environment variable ${environmentName}`
    )
  }
  if (MULTIPLE_VALUE_PATTERN.test(value)) {
    throw new Error(`${environmentName} must contain exactly one value`)
  }
  return value
}

export const parseAllowedMarkets = (
  environment: MarketRuntimeEnvironment
): readonly MarketCode[] => {
  const rawValue = environment.ALLOWED_MARKETS?.trim()
  if (!rawValue) {
    throw new Error(
      "Missing server runtime environment variable ALLOWED_MARKETS"
    )
  }

  const entries = rawValue.split(",").map((entry) => entry.trim())
  const selected = new Set<MarketCode>()
  for (const entry of entries) {
    if (!entry) {
      throw new Error("ALLOWED_MARKETS contains an empty market entry")
    }
    if (!isMarketCode(entry)) {
      throw new Error(`ALLOWED_MARKETS contains unknown market ${entry}`)
    }
    if (selected.has(entry)) {
      throw new Error(`ALLOWED_MARKETS contains duplicate market ${entry}`)
    }
    selected.add(entry)
  }

  return Object.freeze(MARKET_CODES.filter((market) => selected.has(market)))
}

export const readAcceptedHosts = (
  environment: MarketRuntimeEnvironment,
  market: MarketCode
): readonly string[] => {
  const environmentName = `MARKET_ACCEPTED_HOSTS_${market.toUpperCase()}`
  const rawValue = environment[environmentName]?.trim()
  if (!rawValue) {
    throw new Error(
      `Missing server runtime environment variable ${environmentName}`
    )
  }

  const selected = new Set<string>()
  for (const entry of rawValue.split(",")) {
    const host = entry.trim()
    if (!host) {
      throw new Error(`${environmentName} contains an empty host entry`)
    }
    if (selected.has(host)) {
      throw new Error(`${environmentName} contains duplicate host ${host}`)
    }
    if (normalizeHost(host) !== host) {
      throw new Error(`${environmentName} contains invalid host ${host}`)
    }
    selected.add(host)
  }

  return Object.freeze([...selected])
}

export const readCanonicalOrigin = (
  environment: MarketRuntimeEnvironment,
  market: MarketCode
): string => {
  const canonicalHost = readAcceptedHosts(environment, market)[0]
  if (!canonicalHost) {
    throw new Error(`Market ${market} has no configured canonical host`)
  }
  return `https://${canonicalHost}`
}

export const assertUniqueAcceptedHosts = (
  bindings: readonly MarketRoutingBinding[]
) => {
  const ownerByHost = new Map<string, MarketCode>()
  for (const binding of bindings) {
    for (const host of binding.acceptedHosts) {
      const existingMarket = ownerByHost.get(host)
      if (existingMarket) {
        throw new Error(
          `Host ${host} is assigned to both ${existingMarket} and ${binding.market}`
        )
      }
      ownerByHost.set(host, binding.market)
    }
  }
}

export const assertUniqueAuthority = (
  bindings: readonly MarketRuntimeBinding[],
  field:
    | "publishableApiKeyId"
    | "publishableApiKey"
    | "regionId"
    | "salesChannelId"
) => {
  const ownerByValue = new Map<string, MarketCode>()
  for (const binding of bindings) {
    const existingMarket = ownerByValue.get(binding[field])
    if (existingMarket) {
      throw new Error(
        `${field} is assigned to both ${existingMarket} and ${binding.market}`
      )
    }
    ownerByValue.set(binding[field], binding.market)
  }
}
