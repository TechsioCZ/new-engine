// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service"
import { createMedusaStorefrontServerReadPreset } from "@techsio/storefront-data/medusa/server-read"
import type { MedusaProductAttributesInput } from "@techsio/storefront-data/product-attributes/medusa-service"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import type { MedusaProductReviewListInput } from "@techsio/storefront-data/reviews/medusa-service"
import type { MarketCode } from "@/lib/market/market-runtime"
import { getMarketStorefrontSdk } from "./market-sdk.server"
import type {
  CatalogListParams,
  CategoryListParams,
  ProductDetailParams,
  ProductListParams,
  RegionListParams,
} from "./ssr/types"
import { storefrontCoreDefinition } from "./storefront-core-definition"

const createStorefrontServerRead = (market: MarketCode) => {
  const { sdk } = getMarketStorefrontSdk(market)
  return createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    CatalogFacets
  >({
    sdk,
    queryKeyNamespace: storefrontCoreDefinition.namespace,
    cacheConfig: storefrontCoreDefinition.cacheConfig,
    products: {
      serviceConfig: storefrontCoreDefinition.products.serviceConfig,
      hooks: {
        buildListParams: storefrontCoreDefinition.products.hooks
          .buildListParams as (
          input: MedusaProductListInput
        ) => ProductListParams,
        buildDetailParams: storefrontCoreDefinition.products.hooks
          .buildDetailParams as (
          input: MedusaProductDetailInput
        ) => ProductDetailParams,
      },
      queryKeys: storefrontCoreDefinition.queryKeys.products,
    },
    productLists: {
      queryKeys: storefrontCoreDefinition.productLists.queryKeys,
    },
    productAttributes: {
      queryKeys: storefrontCoreDefinition.productAttributes.queryKeys,
    },
    reviews: {
      queryKeys: storefrontCoreDefinition.reviews.queryKeys,
    },
    orders: {
      serviceConfig: storefrontCoreDefinition.orders.serviceConfig,
      hooks: storefrontCoreDefinition.orders.hooks,
      queryKeys: storefrontCoreDefinition.queryKeys.orders,
    },
    regions: {
      queryKeys: storefrontCoreDefinition.queryKeys.regions,
    },
    categories: {
      serviceConfig: storefrontCoreDefinition.categories.serviceConfig,
      hooks: {
        buildListParams: storefrontCoreDefinition.categories.hooks
          .buildListParams as (
          input: MedusaCategoryListInput
        ) => CategoryListParams,
        buildDetailParams: storefrontCoreDefinition.categories.hooks
          .buildDetailParams as (
          input: MedusaCategoryDetailInput
        ) => MedusaCategoryDetailInput,
      },
      queryKeys: storefrontCoreDefinition.queryKeys.categories,
    },
    catalog: {
      serviceConfig: storefrontCoreDefinition.catalog.serviceConfig,
      queryKeys: storefrontCoreDefinition.queryKeys.catalog,
    },
  })
}

const storefrontServerReads = new Map<
  MarketCode,
  ReturnType<typeof createStorefrontServerRead>
>()

const getStorefrontServerRead = (market: MarketCode) => {
  const existing = storefrontServerReads.get(market)
  if (existing) {
    return existing
  }
  const created = createStorefrontServerRead(market)
  storefrontServerReads.set(market, created)
  return created
}

export const fetchServerRegions = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: RegionListParams
) =>
  queryClient.fetchQuery(
    getStorefrontServerRead(market).queries.regions.getListQueryOptions(
      listParams
    )
  )

export const prefetchServerProducts = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.prefetchQuery(
    getStorefrontServerRead(market).queries.products.getListQueryOptions(
      listParams
    )
  )

export const fetchServerProducts = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.fetchQuery(
    getStorefrontServerRead(market).queries.products.getListQueryOptions(
      listParams
    )
  )

export const fetchServerProduct = (
  market: MarketCode,
  queryClient: QueryClient,
  detailParams: ProductDetailParams
) =>
  queryClient.fetchQuery(
    getStorefrontServerRead(market).queries.products.getDetailQueryOptions(
      detailParams
    )
  )

export const prefetchServerProductReviews = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: MedusaProductReviewListInput
) =>
  queryClient.prefetchQuery(
    getStorefrontServerRead(
      market
    ).queries.reviews.getProductReviewsQueryOptions(listParams)
  )

export const prefetchServerProductAttributes = (
  market: MarketCode,
  queryClient: QueryClient,
  input: MedusaProductAttributesInput
) =>
  queryClient.prefetchQuery(
    getStorefrontServerRead(
      market
    ).queries.productAttributes.getDetailQueryOptions(input)
  )

export const fetchServerCategories = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: CategoryListParams
) =>
  queryClient.fetchQuery(
    getStorefrontServerRead(market).queries.categories.getListQueryOptions(
      listParams
    )
  )

export const prefetchServerCatalogProducts = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: CatalogListParams
) =>
  queryClient.prefetchQuery(
    getStorefrontServerRead(market).queries.catalog.getListQueryOptions(
      listParams
    )
  )

export const fetchServerCatalogProducts = (
  market: MarketCode,
  queryClient: QueryClient,
  listParams: CatalogListParams
) =>
  queryClient.fetchQuery(
    getStorefrontServerRead(market).queries.catalog.getListQueryOptions(
      listParams
    )
  )
