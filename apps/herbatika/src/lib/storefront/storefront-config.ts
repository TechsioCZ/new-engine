import type { HttpTypes } from "@medusajs/types"
import { createAuthQueryKeys } from "@techsio/storefront-data/auth/query-keys"
import type { MedusaCartServiceConfig } from "@techsio/storefront-data/cart/medusa-service"
import { createCartQueryKeys } from "@techsio/storefront-data/cart/query-keys"
import type {
  MedusaCatalogListInput,
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
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
  MedusaOrderServiceConfig,
} from "@techsio/storefront-data/orders/medusa-service"
import { createOrderQueryKeys } from "@techsio/storefront-data/orders/query-keys"
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

export const CATEGORY_FIELDS =
  "id,name,handle,parent_category_id,rank,is_active,category_children"

export const CATALOG_DEFAULT_LIMIT = 24
export const CATALOG_DEFAULT_SORT = "recommended"
export const ORDER_DEFAULT_SORT = "-created_at"

export const CART_FIELDS = [
  "id",
  "region_id",
  "customer_id",
  "sales_channel_id",
  "email",
  "currency_code",
  "metadata",
  "created_at",
  "updated_at",
  "original_item_total",
  "original_item_subtotal",
  "original_item_tax_total",
  "item_total",
  "item_subtotal",
  "item_tax_total",
  "original_total",
  "original_subtotal",
  "original_tax_total",
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "discount_tax_total",
  "gift_card_total",
  "gift_card_tax_total",
  "shipping_total",
  "shipping_subtotal",
  "shipping_tax_total",
  "original_shipping_total",
  "original_shipping_subtotal",
  "original_shipping_tax_total",
  "completed_at",
  "billing_address.*",
  "shipping_address.*",
  "region.*",
  "promotions.*",
  "payment_collection.*",
  "*items",
  "items.tax_lines.*",
  "items.adjustments.*",
  "shipping_methods.*",
  "shipping_methods.tax_lines.*",
  "shipping_methods.adjustments.*",
].join(",")

export const ORDER_LIST_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "created_at",
  "updated_at",
  "currency_code",
  "total",
  "item_total",
  "items.id",
  "items.quantity",
].join(",")

export const ORDER_DETAIL_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "created_at",
  "updated_at",
  "currency_code",
  "email",
  "total",
  "subtotal",
  "original_total",
  "original_subtotal",
  "original_tax_total",
  "item_total",
  "item_subtotal",
  "item_tax_total",
  "shipping_total",
  "shipping_subtotal",
  "shipping_tax_total",
  "tax_total",
  "discount_total",
  "discount_tax_total",
  "gift_card_total",
  "gift_card_tax_total",
  "billing_address.*",
  "shipping_address.*",
  "shipping_methods.*",
  "shipping_methods.tax_lines.*",
  "transactions.*",
  "payment_collections.*",
  "*items",
  "items.tax_lines.*",
].join(",")

export const storefrontQueryKeys = {
  auth: createAuthQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  cart: createCartQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  checkout: createCheckoutQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  customers: createCustomerQueryKeys<MedusaCustomerListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE
  ),
  orders: createOrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE
  ),
  products: createProductQueryKeys<
    MedusaProductListInput,
    MedusaProductDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  productLists: createProductListQueryKeys<
    MedusaProductListListKeyInput,
    MedusaProductListDetailKeyInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  reviews: createProductReviewQueryKeys<MedusaProductReviewListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE
  ),
  regions: createRegionQueryKeys<
    MedusaRegionListInput,
    MedusaRegionDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  categories: createCategoryQueryKeys<
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  catalog: createCatalogQueryKeys<MedusaCatalogListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE
  ),
}

export const storefrontProductServiceConfig: MedusaProductServiceConfig<
  HttpTypes.StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
> = {
  defaultListFields: PRODUCT_CARD_FIELDS,
  defaultDetailFields: PRODUCT_DETAIL_FIELDS,
}

export const storefrontCategoryServiceConfig: MedusaCategoryServiceConfig<
  HttpTypes.StoreProductCategory,
  MedusaCategoryListInput,
  MedusaCategoryDetailInput
> = {
  defaultListFields: CATEGORY_FIELDS,
  defaultDetailFields: CATEGORY_FIELDS,
}

export const storefrontCatalogServiceConfig: MedusaCatalogServiceConfig<
  HttpTypes.StoreProduct,
  MedusaCatalogListInput,
  CatalogFacets
> = {
  defaultLimit: CATALOG_DEFAULT_LIMIT,
  defaultSort: CATALOG_DEFAULT_SORT,
}

export const storefrontOrderServiceConfig: MedusaOrderServiceConfig = {
  defaultListFields: ORDER_LIST_FIELDS,
  defaultDetailFields: ORDER_DETAIL_FIELDS,
  defaultOrder: ORDER_DEFAULT_SORT,
  returnNullOnNotFound: true,
}

export const storefrontCartServiceConfig: MedusaCartServiceConfig = {
  cartFields: CART_FIELDS,
}

export const storefrontCheckoutServiceConfig: MedusaCheckoutServiceConfig = {
  cartFields: CART_FIELDS,
  buildPaymentSessionData: buildHerbatikaPaymentSessionData,
}
