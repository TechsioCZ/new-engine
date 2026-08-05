import { storefrontCacheConfig } from "./cache"
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config"
import { buildHerbatikaOrderListParams } from "./order-query-config"
import {
  buildProductListParams,
  DEFAULT_PRODUCT_PAGE_SIZE,
} from "./product-query-config"
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys"
import {
  CATALOG_DEFAULT_LIMIT,
  storefrontCatalogServiceConfig,
  storefrontCategoryServiceConfig,
  storefrontCheckoutServiceConfig,
  storefrontOrderServiceConfig,
  storefrontProductServiceConfig,
  storefrontQueryKeys,
} from "./storefront-config"

export const storefrontCoreDefinition = {
  cacheConfig: storefrontCacheConfig,
  catalog: {
    hooks: {
      defaultPageSize: CATALOG_DEFAULT_LIMIT,
      requireRegion: true,
    },
    serviceConfig: storefrontCatalogServiceConfig,
  },
  categories: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => input,
      buildListParams: buildCategoryListParams,
      defaultPageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    },
    serviceConfig: storefrontCategoryServiceConfig,
  },
  checkout: {
    serviceConfig: storefrontCheckoutServiceConfig,
  },
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  orders: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => input,
      buildListParams: buildHerbatikaOrderListParams,
    },
    serviceConfig: storefrontOrderServiceConfig,
  },
  productAttributes: {
    queryKeys: storefrontQueryKeys.productAttributes,
  },
  productLists: {
    queryKeys: storefrontQueryKeys.productLists,
  },
  products: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => input,
      buildListParams: buildProductListParams,
      buildPrefetchParams: buildProductListParams,
      defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
    },
    serviceConfig: storefrontProductServiceConfig,
  },
  queryKeys: storefrontQueryKeys,
  reviews: {
    queryKeys: storefrontQueryKeys.reviews,
  },
} as const
