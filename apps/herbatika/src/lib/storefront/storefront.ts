"use client";

import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaStorefrontPreset,
} from "@techsio/storefront-data/medusa/preset";
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
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  buildProductListParams,
} from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";
import {
  storefrontCatalogServiceConfig,
  storefrontCategoryServiceConfig,
  storefrontProductServiceConfig,
  storefrontQueryKeys,
  STOREFRONT_CATALOG_DEFAULT_LIMIT,
} from "./storefront-config";

export const storefront = createMedusaStorefrontPreset<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory
>({
  sdk: storefrontSdk,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  auth: {
    service: authService,
    queryKeys: storefrontQueryKeys.auth,
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [storefrontQueryKeys.cart.all()],
        removeOnLogout: [storefrontQueryKeys.cart.all()],
      },
    },
  },
  cart: {
    queryKeys: storefrontQueryKeys.cart,
    hooks: {
      cartStorage,
      requireRegion: true,
      buildCreateParams: buildCreateCartParams,
      buildUpdateParams: buildUpdateCartParams,
      buildAddParams: buildAddLineItemParams,
    },
  },
  products: {
    queryKeys: storefrontQueryKeys.products,
    serviceConfig: storefrontProductServiceConfig,
    hooks: {
      buildListParams: buildProductListParams,
      buildPrefetchParams: buildProductListParams,
      buildDetailParams: (input) => input,
      defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
    },
  },
  orders: {
    service: herbatikaOrderService,
    queryKeys: storefrontQueryKeys.orders,
    hooks: {
      buildListParams: buildHerbatikaOrderListParams,
      buildDetailParams: (input) => input,
    },
  },
  customers: {
    queryKeys: storefrontQueryKeys.customers,
  },
  regions: {
    queryKeys: storefrontQueryKeys.regions,
  },
  categories: {
    queryKeys: storefrontQueryKeys.categories,
    serviceConfig: storefrontCategoryServiceConfig,
    hooks: {
      buildListParams: buildCategoryListParams,
      buildDetailParams: (input) => input,
      defaultPageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    },
  },
  catalog: {
    queryKeys: storefrontQueryKeys.catalog,
    serviceConfig: storefrontCatalogServiceConfig,
    hooks: {
      requireRegion: true,
      defaultPageSize: STOREFRONT_CATALOG_DEFAULT_LIMIT,
    },
  },
});
