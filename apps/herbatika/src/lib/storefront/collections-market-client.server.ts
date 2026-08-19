import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import {
  getMarketRuntime,
  type MarketCode,
  type MarketRuntimeBinding,
} from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { resolveMedusaBackendUrl } from "./runtime-env"

export const COLLECTION_SOURCE_TIMEOUT_MS = 5000

const sdkByMarket = new Map<MarketCode, MedusaSdk>()

export const resolveCollectionMarket = (
  market: string
): MarketRuntimeBinding | null =>
  getMarketRuntime(getConfiguredMarketRuntime(), market)

export const getCollectionMarketSdk = (
  binding: Pick<MarketRuntimeBinding, "market" | "publishableApiKey">
): MedusaSdk => {
  const cached = sdkByMarket.get(binding.market)
  if (cached) {
    return cached
  }
  const sdk = createMedusaSdk({
    baseUrl: resolveMedusaBackendUrl(),
    publishableKey: binding.publishableApiKey,
  })
  sdkByMarket.set(binding.market, sdk)
  return sdk
}
