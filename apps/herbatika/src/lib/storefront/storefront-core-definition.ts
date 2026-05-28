import { storefrontCacheConfig } from "./cache";
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config";
import { buildHerbatikaOrderListParams } from "./order-query-config";
import {
  DEFAULT_PRODUCT_PAGE_SIZE,
  buildProductListParams,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import {
  storefrontCatalogServiceConfig,
  storefrontCategoryServiceConfig,
  storefrontCheckoutServiceConfig,
  storefrontOrderServiceConfig,
  storefrontProductServiceConfig,
  storefrontQueryKeys,
  STOREFRONT_CATALOG_DEFAULT_LIMIT,
} from "./storefront-config";

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
  orders: {
    serviceConfig: storefrontOrderServiceConfig,
    hooks: {
      buildListParams: buildHerbatikaOrderListParams,
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
      defaultPageSize: STOREFRONT_CATALOG_DEFAULT_LIMIT,
    },
  },
} as const;
