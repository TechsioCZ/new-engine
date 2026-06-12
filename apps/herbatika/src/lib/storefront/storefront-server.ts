import "server-only"

import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service"
import { createMedusaStorefrontServerReadPreset } from "@techsio/storefront-data/medusa/server-read"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
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
  HttpTypes.StoreProduct,
  CatalogFacets
>({
  sdk: storefrontSdk,
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

export const fetchServerRegions = (
  queryClient: QueryClient,
  listParams: RegionListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.regions.getListQueryOptions(listParams)
  )

export const prefetchServerProducts = (
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(listParams)
  )

export const fetchServerProducts = (
  queryClient: QueryClient,
  listParams: ProductListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(listParams)
  )

export const fetchServerProduct = (
  queryClient: QueryClient,
  detailParams: ProductDetailParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.products.getDetailQueryOptions(detailParams)
  )

export const fetchServerCategories = (
  queryClient: QueryClient,
  listParams: CategoryListParams
) =>
  queryClient.fetchQuery(
    storefrontServerRead.queries.categories.getListQueryOptions(listParams)
  )

export const prefetchServerCatalogProducts = (
  queryClient: QueryClient,
  listParams: CatalogListParams
) =>
  queryClient.prefetchQuery(
    storefrontServerRead.queries.catalog.getListQueryOptions(listParams)
  )
