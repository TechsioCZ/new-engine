import {
  createMarketRoutingRuntime,
  createMarketRuntime,
  getMarketRuntime,
  type MarketCode,
  type MarketRuntime,
  type MarketRuntimeBinding,
  resolveMarketRuntimeByHost,
} from "./market-runtime"
import type { MarketRoutingRuntime } from "./market-runtime-definitions"

// Pages Router strips modules referenced only by getServerSideProps from the
// browser bundle. Keep this .server module out of render-component imports.

let configuredRuntime: MarketRuntime | undefined
let configuredRoutingRuntime: MarketRoutingRuntime | undefined

export const getConfiguredMarketRoutingRuntime = (): MarketRoutingRuntime => {
  configuredRoutingRuntime ??= createMarketRoutingRuntime(process.env)
  return configuredRoutingRuntime
}

export const requireConfiguredMarketRoutingBinding = (market: MarketCode) => {
  const binding = getConfiguredMarketRoutingRuntime().bindings[market]
  if (!binding) {
    throw new Error(`Market ${market} is not enabled by ALLOWED_MARKETS`)
  }
  return binding
}

export const getConfiguredMarketRuntime = (): MarketRuntime => {
  configuredRuntime ??= createMarketRuntime(process.env)
  return configuredRuntime
}

export const requireConfiguredMarketRuntimeBinding = (
  market: MarketCode
): MarketRuntimeBinding => {
  const binding = getMarketRuntime(getConfiguredMarketRuntime(), market)
  if (!binding) {
    throw new Error(`Market ${market} is not enabled by ALLOWED_MARKETS`)
  }
  return binding
}

export const resolveConfiguredMarketRuntimeBindingByHost = (
  host: string | null | undefined
): MarketRuntimeBinding | null =>
  resolveMarketRuntimeByHost(getConfiguredMarketRuntime(), host)
