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
const MULTIPLE_VALUE_PATTERN = /[,\s]/
const TRAILING_DOT_PATTERN = /\.$/

const ROUTES = {
  sk: {
    canonicalOrigin: "https://herbatica.sk",
    countryCode: "SK",
    locale: "sk-SK",
    market: "sk",
    proposedAliases: ["www.herbatica.sk"],
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
    proposedAliases: ["www.herbatica.ro"],
  },
} as const satisfies Record<MarketCode, MarketRouteDefinition>

const isMarketCode = (value: string): value is MarketCode =>
  MARKET_CODES.some((market) => market === value)

const normalizeHost = (value: string | null | undefined): string | null => {
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

const DECLARED_HOST_OWNERSHIP = buildDeclaredHostOwnership()

const readRequiredValue = (
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

const parseAllowedMarkets = (
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

const readAcceptedHosts = (
  environment: MarketRuntimeEnvironment,
  market: MarketCode,
  canonicalHost: string
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
    if (DECLARED_HOST_OWNERSHIP[host] !== market) {
      throw new Error(
        `${environmentName} contains host ${host} that is not a declared route host for ${market}`
      )
    }
    selected.add(host)
  }

  if (!selected.has(canonicalHost)) {
    throw new Error(
      `${environmentName} must include canonical host ${canonicalHost}`
    )
  }

  const route = ROUTES[market]
  return Object.freeze(
    [canonicalHost, ...route.proposedAliases].filter((host) =>
      selected.has(host)
    )
  )
}

const assertUniqueAuthority = (
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

export const createMarketRuntime = (
  environment: MarketRuntimeEnvironment
): MarketRuntime => {
  const allowedMarkets = parseAllowedMarkets(environment)
  const bindings = allowedMarkets.map((market) => {
    const suffix = market.toUpperCase()
    const route = ROUTES[market]
    const canonicalHost = new URL(route.canonicalOrigin).hostname
    const publishableApiKey = readRequiredValue(
      environment,
      `MARKET_PUBLISHABLE_KEY_${suffix}`
    )
    const publishableApiKeyId = readRequiredValue(
      environment,
      `MARKET_PUBLISHABLE_KEY_ID_${suffix}`
    )
    if (publishableApiKeyId === publishableApiKey) {
      throw new Error(
        `MARKET_PUBLISHABLE_KEY_ID_${suffix} must be distinct from the key value`
      )
    }

    return Object.freeze({
      acceptedHosts: readAcceptedHosts(environment, market, canonicalHost),
      canonicalOrigin: route.canonicalOrigin,
      countryCode: route.countryCode,
      locale: route.locale,
      market: route.market,
      publishableApiKey,
      publishableApiKeyId,
      regionId: readRequiredValue(environment, `MARKET_REGION_${suffix}`),
      salesChannelId: readRequiredValue(
        environment,
        `MARKET_SALES_CHANNEL_${suffix}`
      ),
    })
  })

  assertUniqueAuthority(bindings, "regionId")
  assertUniqueAuthority(bindings, "salesChannelId")
  assertUniqueAuthority(bindings, "publishableApiKey")
  assertUniqueAuthority(bindings, "publishableApiKeyId")

  const bindingByMarket = Object.fromEntries(
    bindings.map((binding) => [binding.market, binding])
  ) as Partial<Record<MarketCode, MarketRuntimeBinding>>
  const marketByHost = Object.fromEntries(
    bindings.flatMap((binding) =>
      binding.acceptedHosts.map((host) => [host, binding.market] as const)
    )
  )

  return Object.freeze({
    allowedMarkets,
    bindings: Object.freeze(bindingByMarket),
    marketByHost: Object.freeze(marketByHost),
  })
}

export const getMarketRuntime = (
  runtime: MarketRuntime,
  market: string | null | undefined
): MarketRuntimeBinding | null =>
  market && isMarketCode(market) ? (runtime.bindings[market] ?? null) : null

export const resolveMarketRuntimeByHost = (
  runtime: MarketRuntime,
  host: string | null | undefined
): MarketRuntimeBinding | null => {
  const normalizedHost = normalizeHost(host)
  const market = normalizedHost
    ? runtime.marketByHost[normalizedHost]
    : undefined
  return market ? (runtime.bindings[market] ?? null) : null
}
