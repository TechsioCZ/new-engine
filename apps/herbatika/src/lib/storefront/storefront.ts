import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaStorefrontPreset,
  createMedusaStorefrontQueryKeys,
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

const presetQueryKeys = createMedusaStorefrontQueryKeys(
  STOREFRONT_QUERY_KEY_NAMESPACE,
);

export const storefront = createMedusaStorefrontPreset<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory
>({
  sdk: storefrontSdk,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  auth: {
    service: authService,
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [presetQueryKeys.cart.all()],
        removeOnLogout: [presetQueryKeys.cart.all()],
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
    serviceConfig: {
      defaultListFields: STOREFRONT_PRODUCT_CARD_FIELDS,
      defaultDetailFields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
    },
    hooks: {
      buildListParams: buildProductListParams,
      buildPrefetchParams: buildProductListParams,
      buildDetailParams: (input) => input,
      defaultPageSize: DEFAULT_PRODUCT_PAGE_SIZE,
    },
  },
  orders: {
    service: herbatikaOrderService,
    hooks: {
      buildListParams: buildHerbatikaOrderListParams,
      buildDetailParams: (input) => input,
    },
  },
  categories: {
    serviceConfig: {
      defaultListFields:
        "id,name,handle,parent_category_id,rank,is_active,category_children",
      defaultDetailFields:
        "id,name,handle,parent_category_id,rank,is_active,category_children",
    },
    hooks: {
      buildListParams: buildCategoryListParams,
      buildDetailParams: (input) => input,
      defaultPageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    },
  },
  catalog: {
    serviceConfig: {
      defaultLimit: 24,
      defaultSort: "recommended",
    },
    hooks: {
      requireRegion: true,
      defaultPageSize: 24,
    },
  },
});
