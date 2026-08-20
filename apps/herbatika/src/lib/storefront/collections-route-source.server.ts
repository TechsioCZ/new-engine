import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaCatalogService,
  type MedusaCatalogListInput,
} from "@techsio/storefront-data/catalog/medusa-service"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import {
  COLLECTION_SOURCE_TIMEOUT_MS,
  getCollectionMarketSdk,
  resolveCollectionMarket,
} from "./collections-market-client.server"
import {
  type CollectionRouteSourceMarketBinding,
  type CollectionRouteSourceRequest,
  readCollectionRouteSource,
} from "./collections-route-source"

type CollectionCatalogInput = MedusaCatalogListInput & {
  collection_id: string
}

const csv = (values: readonly string[] | undefined) =>
  values && values.length > 0 ? values.join(",") : undefined

const stripEmpty = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== null && item !== ""
    )
  )

const createCollectionCatalogService = (
  binding: CollectionRouteSourceMarketBinding
) =>
  createMedusaCatalogService<
    HttpTypes.StoreProduct,
    CollectionCatalogInput,
    CatalogFacets
  >(getCollectionMarketSdk(binding), {
    defaultLimit: 12,
    defaultSort: "recommended",
    normalizeListQuery: (params) =>
      stripEmpty({
        brand: csv(params.brand),
        collection_id: params.collection_id,
        country_code: params.country_code?.toLowerCase(),
        currency_code: params.currency_code?.toLowerCase(),
        form: csv(params.form),
        ingredient: csv(params.ingredient),
        limit: params.limit,
        locale: params.locale,
        page: params.page,
        price_max: params.price_max,
        price_min: params.price_min,
        region_id: params.region_id,
        sort: params.sort,
        status: csv(params.status),
      }),
  })

export const readCollectionRouteSourceFromMedusa = (
  input: CollectionRouteSourceRequest
) =>
  readCollectionRouteSource(input, {
    resolveMarket: resolveCollectionMarket,
    retrieveAssignment: ({ binding, collectionId }) =>
      getCollectionMarketSdk(binding).client.fetch(
        `/store/url-registry/collections/${encodeURIComponent(collectionId)}/assignment`,
        { signal: AbortSignal.timeout(COLLECTION_SOURCE_TIMEOUT_MS) }
      ),
    retrieveCatalog: ({ binding, collectionId, queryState }) => {
      const service = createCollectionCatalogService(binding)
      return service.getCatalogProducts(
        {
          brand: queryState.brand,
          collection_id: collectionId,
          country_code: binding.countryCode.toLowerCase(),
          form: queryState.form,
          ingredient: queryState.ingredient,
          limit: queryState.limit,
          locale: binding.locale,
          page: queryState.page,
          price_max: queryState.price_max ?? undefined,
          price_min: queryState.price_min ?? undefined,
          region_id: binding.regionId,
          sort: queryState.sort,
          status: queryState.status,
        },
        AbortSignal.timeout(COLLECTION_SOURCE_TIMEOUT_MS)
      )
    },
    retrieveCollection: ({ binding, collectionId }) =>
      getCollectionMarketSdk(
        binding
      ).client.fetch<HttpTypes.StoreCollectionResponse>(
        `/store/collections/${encodeURIComponent(collectionId)}`,
        { signal: AbortSignal.timeout(COLLECTION_SOURCE_TIMEOUT_MS) }
      ),
  })
