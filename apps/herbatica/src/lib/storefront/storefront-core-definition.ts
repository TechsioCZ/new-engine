import { storefrontCacheConfig } from "./cache"
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config"
import { buildHerbaticaOrderListParams } from "./order-query-config"
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
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  queryKeys: storefrontQueryKeys,
  checkout: {
    serviceConfig: storefrontCheckoutServiceConfig,
  },
  products: {
    serviceConfig: storefrontProductServiceConfig,
    hooks: {
      buildListParams: buildProductListParams,
      buildPrefetchParams: buildProductListParams,
      buildDetailParams: <TInput>(input: TInput) => input,
      defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
    },
  },
  productLists: {
    queryKeys: storefrontQueryKeys.productLists,
  },
  productAttributes: {
    queryKeys: storefrontQueryKeys.productAttributes,
  },
  reviews: {
    queryKeys: storefrontQueryKeys.reviews,
  },
  orders: {
    serviceConfig: storefrontOrderServiceConfig,
    hooks: {
      buildListParams: buildHerbaticaOrderListParams,
      buildDetailParams: <TInput>(input: TInput) => input,
    },
  },
  categories: {
    serviceConfig: storefrontCategoryServiceConfig,
    hooks: {
      buildListParams: buildCategoryListParams,
      buildDetailParams: <TInput>(input: TInput) => input,
      defaultPageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    },
  },
  catalog: {
    serviceConfig: storefrontCatalogServiceConfig,
    hooks: {
      requireRegion: true,
      defaultPageSize: CATALOG_DEFAULT_LIMIT,
    },
  },
} as const
