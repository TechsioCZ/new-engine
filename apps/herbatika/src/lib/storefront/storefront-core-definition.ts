import { storefrontCacheConfig } from "./cache";
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config";
import { herbatikaOrderService, buildHerbatikaOrderListParams } from "./orders-service";
import {
  DEFAULT_PRODUCT_PAGE_SIZE,
  buildProductListParams,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import {
  storefrontCatalogServiceConfig,
  storefrontCategoryServiceConfig,
  storefrontProductServiceConfig,
  storefrontQueryKeys,
  STOREFRONT_CATALOG_DEFAULT_LIMIT,
} from "./storefront-config";

export const storefrontCoreDefinition = {
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  queryKeys: storefrontQueryKeys,
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
    service: herbatikaOrderService,
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
