"use client"

import type { HttpTypes } from "@medusajs/types"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"
import { storefrontSdk } from "./sdk"
import { storefrontDefinition } from "./storefront-definition"

export const storefront = createMedusaStorefrontPreset<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory
>({
  sdk: storefrontSdk,
  queryKeyNamespace: storefrontDefinition.namespace,
  cacheConfig: storefrontDefinition.cacheConfig,
  auth: {
    service: storefrontDefinition.auth.service,
    queryKeys: storefrontDefinition.queryKeys.auth,
    hooks: storefrontDefinition.auth.hooks,
  },
  cart: {
    serviceConfig: storefrontDefinition.cart.serviceConfig,
    queryKeys: storefrontDefinition.queryKeys.cart,
    hooks: storefrontDefinition.cart.hooks,
  },
  checkout: {
    serviceConfig: storefrontDefinition.checkout.serviceConfig,
    queryKeys: storefrontDefinition.queryKeys.checkout,
  },
  products: {
    queryKeys: storefrontDefinition.queryKeys.products,
    serviceConfig: storefrontDefinition.products.serviceConfig,
    hooks: storefrontDefinition.products.hooks,
  },
  productLists: {
    queryKeys: storefrontDefinition.productLists.queryKeys,
  },
  reviews: {
    queryKeys: storefrontDefinition.reviews.queryKeys,
  },
  orders: {
    serviceConfig: storefrontDefinition.orders.serviceConfig,
    queryKeys: storefrontDefinition.queryKeys.orders,
    hooks: storefrontDefinition.orders.hooks,
  },
  customers: {
    queryKeys: storefrontDefinition.queryKeys.customers,
  },
  regions: {
    queryKeys: storefrontDefinition.queryKeys.regions,
  },
  categories: {
    queryKeys: storefrontDefinition.queryKeys.categories,
    serviceConfig: storefrontDefinition.categories.serviceConfig,
    hooks: storefrontDefinition.categories.hooks,
  },
  catalog: {
    queryKeys: storefrontDefinition.queryKeys.catalog,
    serviceConfig: storefrontDefinition.catalog.serviceConfig,
    hooks: storefrontDefinition.catalog.hooks,
  },
})
