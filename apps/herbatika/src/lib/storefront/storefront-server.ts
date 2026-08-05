import "server-only"
import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import { createMedusaStorefrontServerReadPreset } from "@techsio/storefront-data/medusa/server-read"
import type { MedusaProductAttributesInput } from "@techsio/storefront-data/product-attributes/medusa-service"
import type { MedusaProductReviewListInput } from "@techsio/storefront-data/reviews/medusa-service"

import { storefrontSdk } from "./sdk"
import type {
  CatalogListParams,
  CategoryListParams,
  ProductDetailParams,
  ProductListParams,
  RegionListParams,
} from "./ssr/types"
import { storefrontCoreDefinition } from "./storefront-core-definition"

const storefrontServerRead = createMedusaStorefrontServerReadPreset<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct
>({
  cacheConfig: storefrontCoreDefinition.cacheConfig,
  catalog: {
    queryKeys: storefrontCoreDefinition.queryKeys.catalog,
    serviceConfig: storefrontCoreDefinition.catalog.serviceConfig,
  },
  categories: {
    hooks: {
      buildDetailParams:
        storefrontCoreDefinition.categories.hooks.buildDetailParams,
      buildListParams:
        storefrontCoreDefinition.categories.hooks.buildListParams,
    },
    queryKeys: storefrontCoreDefinition.queryKeys.categories,
    serviceConfig: storefrontCoreDefinition.categories.serviceConfig,
  },
  orders: {
    hooks: storefrontCoreDefinition.orders.hooks,
    queryKeys: storefrontCoreDefinition.queryKeys.orders,
    serviceConfig: storefrontCoreDefinition.orders.serviceConfig,
  },
  productAttributes: {
    queryKeys: storefrontCoreDefinition.productAttributes.queryKeys,
  },
  productLists: {
    queryKeys: storefrontCoreDefinition.productLists.queryKeys,
  },
  products: {
    hooks: {
      buildDetailParams:
        storefrontCoreDefinition.products.hooks.buildDetailParams,
      buildListParams: storefrontCoreDefinition.products.hooks.buildListParams,
    },
    queryKeys: storefrontCoreDefinition.queryKeys.products,
    serviceConfig: storefrontCoreDefinition.products.serviceConfig,
  },
  queryKeyNamespace: storefrontCoreDefinition.namespace,
  regions: {
    queryKeys: storefrontCoreDefinition.queryKeys.regions,
  },
  reviews: {
    queryKeys: storefrontCoreDefinition.reviews.queryKeys,
  },
  sdk: storefrontSdk,
})

export const fetchServerRegions = async (
  queryClient: QueryClient,
  listParams: RegionListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.regions.getListQueryOptions(listParams)
  )

export const prefetchServerProducts = async (
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(listParams)
  )

export const fetchServerProducts = async (
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(listParams)
  )

export const fetchServerProduct = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.products.getDetailQueryOptions(detailParams)
  )

export const prefetchServerProductReviews = async (
  queryClient: QueryClient,
  listParams: MedusaProductReviewListInput
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.reviews.getProductReviewsQueryOptions(
      listParams
    )
  )

export const prefetchServerProductAttributes = async (
  queryClient: QueryClient,
  input: MedusaProductAttributesInput
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.productAttributes.getDetailQueryOptions(input)
  )

export const fetchServerCategories = async (
  queryClient: QueryClient,
  listParams: CategoryListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.categories.getListQueryOptions(listParams)
  )

export const prefetchServerCatalogProducts = async (
  queryClient: QueryClient,
  listParams: CatalogListParams
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.catalog.getListQueryOptions(listParams)
  )
