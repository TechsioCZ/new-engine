import {
  isMarketCode,
  MARKET_CODES as MARKET_CODES_VALUE,
  type MarketCode as MarketCodeDefinition,
  type MarketCountryCode as MarketCountryCodeDefinition,
  type MarketLocale as MarketLocaleDefinition,
  type MarketRuntimeBinding as MarketRuntimeBindingDefinition,
  type MarketRuntime as MarketRuntimeDefinition,
  type MarketRuntimeEnvironment as MarketRuntimeEnvironmentDefinition,
  normalizeHost,
  ROUTES,
} from "./market-runtime-definitions"
import {
  assertUniqueAuthority,
  parseAllowedMarkets,
  readAcceptedHosts,
  readRequiredValue,
} from "./market-runtime-environment"

export const MARKET_CODES = MARKET_CODES_VALUE
export type MarketCode = MarketCodeDefinition
export type MarketCountryCode = MarketCountryCodeDefinition
export type MarketLocale = MarketLocaleDefinition
export type MarketRuntime = MarketRuntimeDefinition
export type MarketRuntimeBinding = MarketRuntimeBindingDefinition
export type MarketRuntimeEnvironment = MarketRuntimeEnvironmentDefinition

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
