import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import { getMarketRuntime, type MarketCode } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import type { CatalogLifecycleDeliveryV1 } from "./catalog-lifecycle-parser"
import { readCatalogLifecycleSource } from "./catalog-lifecycle-source"

const SOURCE_TIMEOUT_MS = 5000
const sdkByMarket = new Map<MarketCode, MedusaSdk>()

const sdkFor = (delivery: CatalogLifecycleDeliveryV1) => {
  const binding = getMarketRuntime(
    getConfiguredMarketRuntime(),
    delivery.marketCode
  )
  if (!binding) {
    return null
  }
  const existing = sdkByMarket.get(binding.market)
  if (existing) {
    return { binding, sdk: existing }
  }
  const sdk = createMedusaSdk({
    baseUrl: resolveMedusaBackendUrl(),
    publishableKey: binding.publishableApiKey,
  })
  sdkByMarket.set(binding.market, sdk)
  return { binding, sdk }
}

export const readCatalogLifecycleSourceFromMedusa = (
  delivery: CatalogLifecycleDeliveryV1
) =>
  readCatalogLifecycleSource(delivery, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    retrieveSource: ({ delivery: request }) => {
      const resolved = sdkFor(request)
      if (!resolved) {
        throw new Error("Catalog market SDK is unavailable")
      }
      const assignment = request.payload.assignment
      if (!assignment) {
        throw new Error("Published catalog assignment is unavailable")
      }
      return resolved.sdk.client.fetch("/store/url-registry/catalog/sources", {
        body: {
          candidates: [
            {
              entityId: request.entityId,
              publicSlug: assignment.publicSlug,
              sourceVersion: request.payload.sourceVersion,
            },
          ],
          entityKind: request.entityKind,
          market: request.marketCode,
          schemaVersion: 1,
        },
        method: "POST",
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      })
    },
  })
