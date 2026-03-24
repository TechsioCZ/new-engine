import { authService } from "./auth/service";
import { storefrontCacheConfig } from "./cache";
import {
  buildAddLineItemParams,
  buildCreateCartParams,
  buildUpdateCartParams,
} from "./cart/params";
import { cartStorage } from "./cart-storage";
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

export const storefrontDefinition = {
  namespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  queryKeys: storefrontQueryKeys,
  auth: {
    service: authService,
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [storefrontQueryKeys.cart.all()],
        removeOnLogout: [storefrontQueryKeys.cart.all()],
      },
    },
  },
  cart: {
    hooks: {
      cartStorage,
      requireRegion: true,
      buildCreateParams: buildCreateCartParams,
      buildUpdateParams: buildUpdateCartParams,
      buildAddParams: buildAddLineItemParams,
    },
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
