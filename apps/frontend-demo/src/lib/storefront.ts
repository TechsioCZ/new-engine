import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { ORDER_FIELDS } from "@/lib/order-utils"
import {
  DETAIL_FIELDS,
  LIST_FIELDS,
  transformProduct,
} from "@/services/product-service"
import type { Product } from "@/types/product"

const cartStorage = createLocalStorageValueStore({
  key: STORAGE_KEYS.CART_ID,
})

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
      requireRegion: false,
    },
    serviceConfig: {
      defaultListFields: LIST_FIELDS,
      defaultDetailFields: DETAIL_FIELDS,
      transformProduct: (product) => transformProduct(product, true),
    },
  },
  orders: {
    serviceConfig: {
      defaultFields: ORDER_FIELDS.join(","),
    },
  },
})

export const { hooks: storefrontHooks, flows: storefrontFlows } = storefront
export { cartStorage }
