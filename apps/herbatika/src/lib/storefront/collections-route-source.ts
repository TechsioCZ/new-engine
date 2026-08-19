import type { HttpTypes } from "@medusajs/types"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import type { CatalogQueryState } from "./catalog-query-state"
import { PLP_PAGE_SIZE } from "./plp-config"

export type CollectionAssignment = Readonly<{
  entityId: string
  id: string
  marketCode: string
  publicationStatus: "published"
  publicSlug: string
  salesChannelId: string
  schemaVersion: 1
  sourceVersion: string
}>

export type CollectionCatalogPage = Readonly<{
  count: number
  facets: CatalogFacets
  limit: number
  page: number
  products: HttpTypes.StoreProduct[]
  totalPages: number
}>

export type CollectionRouteSourceValue = Readonly<{
  catalog: CollectionCatalogPage
  collection: Pick<HttpTypes.StoreCollection, "id" | "title">
}>

export type CollectionRouteSourceMarketBinding = Pick<
  MarketRuntimeBinding,
  | "countryCode"
  | "locale"
  | "market"
  | "publishableApiKey"
  | "regionId"
  | "salesChannelId"
>

export type CollectionRouteSourceRequest = Readonly<{
  collectionId: string
  market: string
  queryState: CatalogQueryState
}>

export type CollectionRouteSourceDependencies = Readonly<{
  resolveMarket: (market: string) => CollectionRouteSourceMarketBinding | null
  retrieveAssignment: (input: {
    binding: CollectionRouteSourceMarketBinding
    collectionId: string
  }) => Promise<unknown>
  retrieveCatalog: (input: {
    binding: CollectionRouteSourceMarketBinding
    collectionId: string
    queryState: CatalogQueryState & Readonly<{ limit: number }>
  }) => Promise<CollectionCatalogPage>
  retrieveCollection: (input: {
    binding: CollectionRouteSourceMarketBinding
    collectionId: string
  }) => Promise<unknown>
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const readAssignment = (
  value: unknown,
  binding: CollectionRouteSourceMarketBinding,
  collectionId: string
): CollectionAssignment | null => {
  if (!isRecord(value)) {
    return null
  }
  const assignment = isRecord(value.assignment) ? value.assignment : value
  return assignment.schemaVersion === 1 &&
    assignment.id === collectionId &&
    assignment.entityId === collectionId &&
    assignment.marketCode === binding.market &&
    assignment.salesChannelId === binding.salesChannelId &&
    assignment.publicationStatus === "published" &&
    typeof assignment.publicSlug === "string" &&
    assignment.publicSlug.length > 0 &&
    typeof assignment.sourceVersion === "string" &&
    assignment.sourceVersion.length > 0
    ? (assignment as unknown as CollectionAssignment)
    : null
}

const readCollection = (
  value: unknown,
  collectionId: string
): Pick<HttpTypes.StoreCollection, "id" | "title"> | null => {
  if (!isRecord(value)) {
    return null
  }
  const collection = isRecord(value.collection) ? value.collection : value
  return collection.id === collectionId &&
    typeof collection.title === "string" &&
    collection.title.trim().length > 0
    ? { id: collectionId, title: collection.title.trim() }
    : null
}

const errorStatus = (error: unknown): number | null => {
  if (!isRecord(error)) {
    return null
  }
  return typeof error.status === "number" ? error.status : null
}

const mapReadError = <Value>(error: unknown): SourceReadResult<Value> => {
  const status = errorStatus(error)
  if (status === 404) {
    return { kind: "missing" }
  }
  if (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status ?? 0) >= 500
  ) {
    return { kind: "unavailable" }
  }
  return {
    causeCode: "MEDUSA_REJECTED_COLLECTION_REQUEST",
    kind: "invalid-response",
  }
}

export const buildCollectionCatalogInput = (
  queryState: CatalogQueryState
): CatalogQueryState & Readonly<{ limit: number }> => ({
  ...queryState,
  limit: PLP_PAGE_SIZE,
})

export const readCollectionRouteSource = async (
  { collectionId, market, queryState }: CollectionRouteSourceRequest,
  dependencies: CollectionRouteSourceDependencies
): Promise<SourceReadResult<CollectionRouteSourceValue>> => {
  const binding = dependencies.resolveMarket(market)
  if (!binding) {
    return {
      causeCode: "MISSING_MARKET_BINDING",
      kind: "invalid-response",
    }
  }

  try {
    const assignmentPayload = await dependencies.retrieveAssignment({
      binding,
      collectionId,
    })
    if (!readAssignment(assignmentPayload, binding, collectionId)) {
      return {
        causeCode: "INVALID_COLLECTION_ASSIGNMENT_RESPONSE",
        kind: "invalid-response",
      }
    }

    const [collectionPayload, catalog] = await Promise.all([
      dependencies.retrieveCollection({ binding, collectionId }),
      dependencies.retrieveCatalog({
        binding,
        collectionId,
        queryState: buildCollectionCatalogInput(queryState),
      }),
    ])
    const collection = readCollection(collectionPayload, collectionId)
    if (!collection) {
      return {
        causeCode: "INVALID_MEDUSA_COLLECTION_RESPONSE",
        kind: "invalid-response",
      }
    }

    return {
      kind: "found",
      value: { catalog, collection },
    }
  } catch (error) {
    return mapReadError(error)
  }
}
