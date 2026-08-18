import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import { getMarketRuntime, type MarketCode } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  type ProductRouteSourceMarketBinding,
  type ProductRouteSourceRequest,
  readProductRouteSource,
} from "./product-route-source"
import { resolveMedusaBackendUrl } from "./runtime-env"

// This module is imported only by getServerSideProps. Pages Router rejects the
// App-Router-only `server-only` marker and tree-shakes GSSP dependencies.

const PRODUCT_SOURCE_TIMEOUT_MS = 5000
const sdkByMarket = new Map<MarketCode, MedusaSdk>()

const getMarketSdk = (binding: ProductRouteSourceMarketBinding): MedusaSdk => {
  const existing = sdkByMarket.get(binding.market)
  if (existing) {
    return existing
  }
  const sdk = createMedusaSdk({
    baseUrl: resolveMedusaBackendUrl(),
    publishableKey: binding.publishableApiKey,
  })
  sdkByMarket.set(binding.market, sdk)
  return sdk
}

export const readProductRouteSourceFromMedusa = (
  input: ProductRouteSourceRequest
) =>
  readProductRouteSource(input, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    retrieveProduct: ({ binding, productId, query }) => {
      const sdk = getMarketSdk(binding)
      // The SDK's high-level retrieve method has no AbortSignal input. Its
      // client keeps the publishable-key behavior while allowing hard timeout.
      return sdk.client.fetch<HttpTypes.StoreProductResponse>(
        `/store/products/${encodeURIComponent(productId)}`,
        {
          query,
          signal: AbortSignal.timeout(PRODUCT_SOURCE_TIMEOUT_MS),
        }
      )
    },
  })
