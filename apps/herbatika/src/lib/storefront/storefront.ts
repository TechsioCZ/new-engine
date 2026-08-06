"use client"

import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"

import { storefrontSdk } from "./sdk"
import { storefrontDefinition } from "./storefront-definition"

export const storefront = createMedusaStorefrontPreset({
  auth: {
    hooks: storefrontDefinition.auth.hooks,
    queryKeys: storefrontDefinition.queryKeys.auth,
    service: storefrontDefinition.auth.service,
  },
  cacheConfig: storefrontDefinition.cacheConfig,
  cart: {
    hooks: storefrontDefinition.cart.hooks,
    queryKeys: storefrontDefinition.queryKeys.cart,
    serviceConfig: storefrontDefinition.cart.serviceConfig,
  },
  catalog: {
    hooks: storefrontDefinition.catalog.hooks,
    queryKeys: storefrontDefinition.queryKeys.catalog,
    serviceConfig: storefrontDefinition.catalog.serviceConfig,
  },
  categories: {
    hooks: storefrontDefinition.categories.hooks,
    queryKeys: storefrontDefinition.queryKeys.categories,
    serviceConfig: storefrontDefinition.categories.serviceConfig,
  },
  checkout: {
    queryKeys: storefrontDefinition.queryKeys.checkout,
    serviceConfig: storefrontDefinition.checkout.serviceConfig,
  },
  customers: {
    queryKeys: storefrontDefinition.queryKeys.customers,
  },
  orders: {
    hooks: storefrontDefinition.orders.hooks,
    queryKeys: storefrontDefinition.queryKeys.orders,
    serviceConfig: storefrontDefinition.orders.serviceConfig,
  },
  productAttributes: {
    queryKeys: storefrontDefinition.productAttributes.queryKeys,
  },
  productLists: {
    queryKeys: storefrontDefinition.productLists.queryKeys,
  },
  products: {
    hooks: storefrontDefinition.products.hooks,
    queryKeys: storefrontDefinition.queryKeys.products,
    serviceConfig: storefrontDefinition.products.serviceConfig,
  },
  queryKeyNamespace: storefrontDefinition.namespace,
  regions: {
    queryKeys: storefrontDefinition.queryKeys.regions,
  },
  reviews: {
    queryKeys: storefrontDefinition.reviews.queryKeys,
  },
  sdk: storefrontSdk,
})
