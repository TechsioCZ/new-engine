import { createMarketRuntime, type MarketRuntime } from "./market-runtime"

// Pages Router strips modules referenced only by getServerSideProps from the
// browser bundle. Keep this .server module out of render-component imports.

let configuredRuntime: MarketRuntime | undefined

export const getConfiguredMarketRuntime = (): MarketRuntime => {
  configuredRuntime ??= createMarketRuntime(process.env)
  return configuredRuntime
}
