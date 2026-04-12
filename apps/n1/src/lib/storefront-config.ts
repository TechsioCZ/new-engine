import type { HttpTypes } from "@medusajs/types"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
  MedusaProductServiceConfig,
} from "@techsio/storefront-data/products/medusa-service"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { buildProductQueryParams } from "@/lib/product-query-params"

export const STOREFRONT_QUERY_NAMESPACE = "n1"

type MedusaProductListQuery = MedusaProductListInput & Record<string, unknown>

export const normalizeProductListParams = (
  input: MedusaProductListInput
): MedusaProductListQuery => {
  const normalizedInput = buildProductQueryParams(input)

  return {
    ...normalizedInput,
    country_code: normalizedInput.country_code ?? DEFAULT_COUNTRY_CODE,
    fields: normalizedInput.fields ?? PRODUCT_LIST_FIELDS,
  } as MedusaProductListQuery
}

export const storefrontCacheConfig = createCacheConfig({
  realtime: {
    ...appCacheConfig.realtime,
    refetchOnMount: true,
  },
  userData: appCacheConfig.userData,
})

export const productServiceConfig = {
  defaultListFields: PRODUCT_LIST_FIELDS,
  defaultDetailFields: PRODUCT_DETAILED_FIELDS,
  normalizeListQuery: normalizeProductListParams,
  normalizeDetailQuery: (params: MedusaProductDetailInput) => ({
    handle: params.handle,
    region_id: params.region_id,
    country_code: params.country_code ?? DEFAULT_COUNTRY_CODE,
    province: params.province,
    cart_id: params.cart_id,
    locale: params.locale,
    fields: params.fields ?? PRODUCT_DETAILED_FIELDS,
  }),
  createGlobalFetcher: true,
} satisfies MedusaProductServiceConfig<
  HttpTypes.StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
>

export const productHooksConfig = {
  defaultPageSize: PRODUCT_LIMIT,
  requireRegion: true,
  buildListParams: normalizeProductListParams,
  buildPrefetchParams: normalizeProductListParams,
}

export const productServerReadConfig = {
  serviceConfig: productServiceConfig,
  hooks: {
    buildListParams: normalizeProductListParams,
  },
}

export const orderServiceConfig = {
  defaultFields: "*items",
}

export const orderHooksConfig = {
  defaultPageSize: 20,
}
