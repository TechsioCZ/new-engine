import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import { getMarketRuntime, type MarketCode } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import {
  type CatalogPublicationProofRequest,
  readCatalogPublicationProof,
} from "./catalog-publication-proof"
import { resolveMedusaBackendUrl } from "./runtime-env"

const PUBLICATION_SOURCE_TIMEOUT_MS = 5000
const sdkByMarket = new Map<MarketCode, MedusaSdk>()

const sdkFor = (market: MarketCode) => {
  const binding = getMarketRuntime(getConfiguredMarketRuntime(), market)
  if (!binding) {
    return null
  }
  const existing = sdkByMarket.get(market)
  if (existing) {
    return { binding, sdk: existing }
  }
  const sdk = createMedusaSdk({
    baseUrl: resolveMedusaBackendUrl(),
    publishableKey: binding.publishableApiKey,
  })
  sdkByMarket.set(market, sdk)
  return { binding, sdk }
}

export const readCatalogPublicationProofFromMedusa = (
  request: CatalogPublicationProofRequest
) =>
  readCatalogPublicationProof(request, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    retrieveAssignments: ({ request: candidate }) => {
      const resolved = sdkFor(candidate.market)
      if (!resolved) {
        throw new Error("Catalog publication market SDK is unavailable")
      }
      return resolved.sdk.client.fetch("/store/url-registry/catalog/sources", {
        body: {
          candidates: [
            {
              entityId: candidate.entityId,
              publicSlug: candidate.publicSlug,
              sourceVersion: candidate.sourceVersion,
            },
          ],
          entityKind: candidate.entityKind,
          market: candidate.market,
          schemaVersion: 1,
        },
        method: "POST",
        signal: AbortSignal.timeout(PUBLICATION_SOURCE_TIMEOUT_MS),
      })
    },
  })
