import type { StoreProduct } from "@medusajs/types"
import { createProductHooks } from "@techsio/storefront-data/products/hooks"
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import {
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import {
  buildProductQueryParams,
  type ProductQueryParams,
} from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"

export type ProductListInput = {
  category_id?: string[]
  page?: number
  limit?: number
  enabled?: boolean
  region_id?: string
  country_code?: string
}

export type ProductDetailInput = {
  handle: string
  fields?: string
  enabled?: boolean
  region_id?: string
  country_code?: string
}

type ProductListParams = ProductQueryParams
type ProductDetailParams = MedusaProductDetailInput

function buildListParams(input: ProductListInput): ProductListParams {
  return buildProductQueryParams(input)
}

function buildDetailParams(input: ProductDetailInput): ProductDetailParams {
  return {
    handle: input.handle,
    region_id: input.region_id,
    country_code: input.country_code ?? "cz",
    fields: input.fields,
  }
}

const productQueryKeys = {
  list: (params: ProductListParams) => queryKeys.products.list(params),
  detail: (params: ProductDetailParams) =>
    queryKeys.products.detail(
      params.handle,
      params.region_id ?? "",
      params.country_code ?? "cz"
    ),
}

const productService = createMedusaProductService<
  StoreProduct,
  MedusaProductListInput,
  MedusaProductDetailInput
>(sdk, {
  defaultListFields: PRODUCT_LIST_FIELDS,
  defaultDetailFields: PRODUCT_DETAILED_FIELDS,
  normalizeListQuery: (params) => ({
    ...params,
    country_code: params.country_code ?? "cz",
    fields: params.fields ?? PRODUCT_LIST_FIELDS,
  }),
  normalizeDetailQuery: (params) => ({
    handle: params.handle,
    limit: 1,
    region_id: params.region_id,
    country_code: params.country_code ?? "cz",
    province: params.province,
    cart_id: params.cart_id,
    locale: params.locale,
    fields: params.fields ?? PRODUCT_DETAILED_FIELDS,
  }),
  createGlobalFetcher: true,
})

export const productHooks = createProductHooks<
  StoreProduct,
  ProductListInput,
  ProductListParams,
  ProductDetailInput,
  ProductDetailParams
>({
  service: productService,
  buildListParams,
  buildDetailParams,
  queryKeys: productQueryKeys,
  queryKeyNamespace: "n1",
  defaultPageSize: PRODUCT_LIMIT,
  requireRegion: true,
})
