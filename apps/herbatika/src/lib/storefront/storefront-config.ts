import type { HttpTypes } from "@medusajs/types";
import { createAuthQueryKeys } from "@techsio/storefront-data/auth/query-keys";
import { createCartQueryKeys } from "@techsio/storefront-data/cart/query-keys";
import {
  createCatalogQueryKeys,
} from "@techsio/storefront-data/catalog/query-keys";
import type {
  MedusaCatalogListInput,
  MedusaCatalogServiceConfig,
} from "@techsio/storefront-data/catalog/medusa-service";
import { createCategoryQueryKeys } from "@techsio/storefront-data/categories/query-keys";
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
  MedusaCategoryServiceConfig,
} from "@techsio/storefront-data/categories/medusa-service";
import { createCheckoutQueryKeys } from "@techsio/storefront-data/checkout/query-keys";
import { createCustomerQueryKeys } from "@techsio/storefront-data/customers/query-keys";
import type { MedusaCustomerListInput } from "@techsio/storefront-data/customers/medusa-service";
import { createOrderQueryKeys } from "@techsio/storefront-data/orders/query-keys";
import type {
  MedusaOrderDetailInput,
  MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service";
import { createProductQueryKeys } from "@techsio/storefront-data/products/query-keys";
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
} from "@techsio/storefront-data/products/medusa-service";
import { createRegionQueryKeys } from "@techsio/storefront-data/regions/query-keys";
import type {
  MedusaRegionDetailInput,
  MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service";
import { STOREFRONT_PRODUCT_CARD_FIELDS, STOREFRONT_PRODUCT_DETAIL_FIELDS } from "./product-query-config";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";

export const STOREFRONT_CATEGORY_FIELDS =
  "id,name,handle,parent_category_id,rank,is_active,category_children";

export const STOREFRONT_CATALOG_DEFAULT_LIMIT = 24;
export const STOREFRONT_CATALOG_DEFAULT_SORT = "recommended";

export const storefrontQueryKeys = {
  auth: createAuthQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  cart: createCartQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  checkout: createCheckoutQueryKeys(STOREFRONT_QUERY_KEY_NAMESPACE),
  customers: createCustomerQueryKeys<MedusaCustomerListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  orders: createOrderQueryKeys<MedusaOrderListInput, MedusaOrderDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  products: createProductQueryKeys<MedusaProductListInput, MedusaProductDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  regions: createRegionQueryKeys<MedusaRegionListInput, MedusaRegionDetailInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
  categories: createCategoryQueryKeys<
    MedusaCategoryListInput,
    MedusaCategoryDetailInput
  >(STOREFRONT_QUERY_KEY_NAMESPACE),
  catalog: createCatalogQueryKeys<MedusaCatalogListInput>(
    STOREFRONT_QUERY_KEY_NAMESPACE,
  ),
};

export const storefrontProductServiceConfig: MedusaProductServiceConfig<
  HttpTypes.StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
> = {
  defaultListFields: STOREFRONT_PRODUCT_CARD_FIELDS,
  defaultDetailFields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
};

export const storefrontCategoryServiceConfig: MedusaCategoryServiceConfig<
  HttpTypes.StoreProductCategory,
  MedusaCategoryListInput,
  MedusaCategoryDetailInput
> = {
  defaultListFields: STOREFRONT_CATEGORY_FIELDS,
  defaultDetailFields: STOREFRONT_CATEGORY_FIELDS,
};

export const storefrontCatalogServiceConfig: MedusaCatalogServiceConfig<
  HttpTypes.StoreProduct,
  MedusaCatalogListInput,
  import("@techsio/storefront-data/catalog/types").CatalogFacets
> = {
  defaultLimit: STOREFRONT_CATALOG_DEFAULT_LIMIT,
  defaultSort: STOREFRONT_CATALOG_DEFAULT_SORT,
};
