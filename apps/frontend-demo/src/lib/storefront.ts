import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"
import type { MedusaProductListInput } from "@techsio/storefront-data/products/medusa-service"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { ORDER_FIELDS } from "@/lib/order-utils"
import {
  PRODUCT_DETAIL_FIELDS,
  PRODUCT_LIST_FIELDS,
} from "@/lib/product-query-params"
import { transformProduct } from "@/lib/product-transform"
import type { Product } from "@/types/product"

const cartStorage = createLocalStorageValueStore({
  key: STORAGE_KEYS.CART_ID,
})

const DEFAULT_PRODUCT_PAGE_SIZE = 20

type StorefrontProductHookInput = MedusaProductListInput & {
  enabled?: boolean
  page?: number
}

export const buildStorefrontProductListParams = (
  input: StorefrontProductHookInput
): MedusaProductListInput => {
  const { enabled: _enabled, page, offset, limit, ...query } = input
  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PRODUCT_PAGE_SIZE
  let resolvedOffset = offset

  if (typeof resolvedOffset !== "number" && typeof page === "number") {
    resolvedOffset = (page - 1) * resolvedLimit
  }

  return {
    ...query,
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof resolvedOffset === "number" ? { offset: resolvedOffset } : {}),
  }
}

export const storefront = createMedusaStorefrontPreset<Product>({
  sdk,
  queryKeyNamespace: "frontend-demo",
  cart: {
    hooks: {
      cartStorage,
    },
  },
  products: {
    hooks: {
      buildListParams: buildStorefrontProductListParams,
      requireRegion: false,
    },
    serviceConfig: {
      defaultListFields: PRODUCT_LIST_FIELDS,
      defaultDetailFields: PRODUCT_DETAIL_FIELDS,
      transformProduct: (product) => transformProduct(product, true),
    },
  },
  orders: {
    serviceConfig: {
      defaultFields: ORDER_FIELDS.join(","),
    },
  },
})

export const { flows: storefrontFlows } = storefront
