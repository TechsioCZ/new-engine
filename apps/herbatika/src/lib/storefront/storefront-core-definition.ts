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

export interface StorefrontCoreDefinition {
  cacheConfig: typeof storefrontCacheConfig
  catalog: {
    hooks: {
      defaultPageSize: typeof CATALOG_DEFAULT_LIMIT
      requireRegion: true
    }
    serviceConfig: typeof storefrontCatalogServiceConfig
  }
  categories: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => TInput
      buildListParams: typeof buildCategoryListParams
      defaultPageSize: typeof DEFAULT_CATEGORY_PAGE_SIZE
    }
    serviceConfig: typeof storefrontCategoryServiceConfig
  }
  checkout: {
    serviceConfig: typeof storefrontCheckoutServiceConfig
  }
  namespace: typeof STOREFRONT_QUERY_KEY_NAMESPACE
  orders: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => TInput
      buildListParams: typeof buildHerbatikaOrderListParams
    }
    serviceConfig: typeof storefrontOrderServiceConfig
  }
  productAttributes: {
    queryKeys: typeof storefrontQueryKeys.productAttributes
  }
  productLists: {
    queryKeys: typeof storefrontQueryKeys.productLists
  }
  products: {
    hooks: {
      buildDetailParams: <TInput>(input: TInput) => TInput
      buildListParams: typeof buildProductListParams
      buildPrefetchParams: typeof buildProductListParams
      defaultPageSize: typeof DEFAULT_PRODUCT_PAGE_SIZE
    }
    serviceConfig: typeof storefrontProductServiceConfig
  }
  queryKeys: typeof storefrontQueryKeys
  reviews: {
    queryKeys: typeof storefrontQueryKeys.reviews
  }
}

export const storefrontCoreDefinition: StorefrontCoreDefinition = {
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
