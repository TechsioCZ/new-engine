import type { HttpTypes } from "@medusajs/types"
import { createAuthQueryKeys } from "@techsio/storefront-data/auth/query-keys"
import type { MedusaCartServiceConfig } from "@techsio/storefront-data/cart/medusa-service"
import { createCartQueryKeys } from "@techsio/storefront-data/cart/query-keys"
import type {
  MedusaCatalogListInput,
  MedusaCatalogProduct,
  MedusaCatalogServiceConfig,
} from "@techsio/storefront-data/catalog/medusa-service"
import { createCatalogQueryKeys } from "@techsio/storefront-data/catalog/query-keys"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
  MedusaCategoryServiceConfig,
} from "@techsio/storefront-data/categories/medusa-service"
import { createCategoryQueryKeys } from "@techsio/storefront-data/categories/query-keys"
import type { MedusaCheckoutServiceConfig } from "@techsio/storefront-data/checkout/medusa-service"
import { createCheckoutQueryKeys } from "@techsio/storefront-data/checkout/query-keys"
import type { MedusaCustomerListInput } from "@techsio/storefront-data/customers/medusa-service"
import { createCustomerQueryKeys } from "@techsio/storefront-data/customers/query-keys"
import type { MedusaStorefrontQueryKeys } from "@techsio/storefront-data/medusa/preset"
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
  MedusaOrderServiceConfig,
} from "@techsio/storefront-data/orders/medusa-service"
import { createOrderQueryKeys } from "@techsio/storefront-data/orders/query-keys"
import type { MedusaProductAttributesInput } from "@techsio/storefront-data/product-attributes/medusa-service"
import { createProductAttributeQueryKeys } from "@techsio/storefront-data/product-attributes/query-keys"
import type {
  MedusaProductListDetailKeyInput,
  MedusaProductListListKeyInput,
} from "@techsio/storefront-data/product-lists/medusa-service"
import { createProductListQueryKeys } from "@techsio/storefront-data/product-lists/query-keys"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
} from "@techsio/storefront-data/products/medusa-service"
import { createProductQueryKeys } from "@techsio/storefront-data/products/query-keys"
import type {
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service"
import { createRegionQueryKeys } from "@techsio/storefront-data/regions/query-keys"
import type { MedusaProductReviewListInput } from "@techsio/storefront-data/reviews/medusa-service"
import { createProductReviewQueryKeys } from "@techsio/storefront-data/reviews/query-keys"

import { buildHerbatikaPaymentSessionData } from "./payment-session"
import {
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
} from "./product-query-config"
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys"
import {
  CART_FIELDS,
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_SORT,
  CATEGORY_FIELDS,
  ORDER_DEFAULT_SORT,
  ORDER_DETAIL_FIELDS,
  ORDER_LIST_FIELDS,
} from "./storefront-service-fields"

export { CATALOG_DEFAULT_LIMIT } from "./storefront-service-fields"

export const storefrontQueryKeys: Omit<
  MedusaStorefrontQueryKeys,
  "collections" | "productLocationAvailability"
> = {
  auth: createAuthQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  cart: createCartQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  catalog: createCatalogQueryKeys<MedusaCatalogListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  categories: createCategoryQueryKeys<
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  checkout: createCheckoutQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  customers: createCustomerQueryKeys<MedusaCustomerListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  orders: createOrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  productAttributes:
    createProductAttributeQueryKeys<MedusaProductAttributesInput>(
      STOREFRONT_QUERY_KEY_NAMESPACE,
    ),
  productLists: createProductListQueryKeys<
    MedusaProductListListKeyInput,
    MedusaProductListDetailKeyInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  products: createProductQueryKeys<
    MedusaProductListInput,
    MedusaProductDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  regions: createRegionQueryKeys<
    MedusaRegionListInput,
    MedusaRegionDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  reviews: createProductReviewQueryKeys<MedusaProductReviewListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
}

export const storefrontProductServiceConfig: MedusaProductServiceConfig<
  HttpTypes.StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
> = {
  defaultDetailFields: PRODUCT_DETAIL_FIELDS,
  defaultListFields: PRODUCT_CARD_FIELDS,
}

export const storefrontCategoryServiceConfig: MedusaCategoryServiceConfig<
  HttpTypes.StoreProductCategory,
  MedusaCategoryListInput,
  MedusaCategoryDetailInput
> = {
  defaultDetailFields: CATEGORY_FIELDS,
  defaultListFields: CATEGORY_FIELDS,
}

export const storefrontCatalogServiceConfig: MedusaCatalogServiceConfig<
  MedusaCatalogProduct,
  MedusaCatalogListInput,
  CatalogFacets
> = {
  defaultLimit: CATALOG_DEFAULT_LIMIT,
  defaultSort: CATALOG_DEFAULT_SORT,
}

export const storefrontOrderServiceConfig: MedusaOrderServiceConfig = {
  defaultDetailFields: ORDER_DETAIL_FIELDS,
  defaultListFields: ORDER_LIST_FIELDS,
  defaultOrder: ORDER_DEFAULT_SORT,
  returnNullOnNotFound: true,
}

export const storefrontCartServiceConfig: MedusaCartServiceConfig = {
  cartFields: CART_FIELDS,
}

export const storefrontCheckoutServiceConfig: MedusaCheckoutServiceConfig = {
  buildPaymentSessionData: buildHerbatikaPaymentSessionData,
  cartFields: CART_FIELDS,
}
