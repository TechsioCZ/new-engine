import {
  createMedusaStorefrontServerReadPreset,
  type MedusaStorefrontServerReadPresetResult,
} from "@techsio/storefront-data/medusa/server-read"
import type { HttpTypes } from "@medusajs/types"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import { sdk } from "@/lib/medusa-client"
import {
  orderServiceConfig,
  productServerReadConfig,
  storefrontCacheConfig,
  STOREFRONT_QUERY_NAMESPACE,
} from "@/lib/storefront-config"

export const storefrontServerRead: MedusaStorefrontServerReadPresetResult<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct,
  CatalogFacets
> = createMedusaStorefrontServerReadPreset({
  sdk,
  queryKeyNamespace: STOREFRONT_QUERY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  products: productServerReadConfig,
  orders: {
    serviceConfig: orderServiceConfig,
  },
})
