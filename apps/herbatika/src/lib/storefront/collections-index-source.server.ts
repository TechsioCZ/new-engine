import type { HttpTypes } from "@medusajs/types"
import { readCollectionIndexSource } from "./collections-index-source"
import {
  COLLECTION_SOURCE_TIMEOUT_MS,
  getCollectionMarketSdk,
  resolveCollectionMarket,
} from "./collections-market-client.server"

export const readCollectionIndexSourceFromMedusa = (
  input: Readonly<{
    market: string
    routeSourceIds: readonly string[]
  }>
) =>
  readCollectionIndexSource(input, {
    listAssignments: ({ binding, limit, offset }) =>
      getCollectionMarketSdk(binding).client.fetch(
        "/store/url-registry/collections/assignments",
        {
          query: { limit, offset },
          signal: AbortSignal.timeout(COLLECTION_SOURCE_TIMEOUT_MS),
        }
      ),
    listCollections: ({ binding, ids }) =>
      getCollectionMarketSdk(
        binding
      ).client.fetch<HttpTypes.StoreCollectionListResponse>(
        "/store/collections",
        {
          query: { id: ids, limit: ids.length },
          signal: AbortSignal.timeout(COLLECTION_SOURCE_TIMEOUT_MS),
        }
      ),
    resolveMarket: resolveCollectionMarket,
  })
