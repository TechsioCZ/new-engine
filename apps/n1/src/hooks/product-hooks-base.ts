import type { StoreProduct } from "@medusajs/types"
import { createProductHooks } from "@techsio/storefront-data/products/hooks"
import {
  type MedusaProductDetailInput,
} from "@techsio/storefront-data/products/medusa-service"
import type { ProductService } from "@techsio/storefront-data/products/types"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
} from "@/lib/constants"
import {
  getProductsWithMeiliFallback,
  type ProductListResponse,
} from "@/lib/products/product-search-client"
import { sdk } from "@/lib/medusa-client"
import {
  buildProductQueryParams,
  type ProductQueryParams,
} from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"

export type ProductListInput = {
  category_id?: string[]
  q?: string
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
    country_code: input.country_code ?? DEFAULT_COUNTRY_CODE,
    fields: input.fields,
  }
}

const productQueryKeys = {
  list: (params: ProductListParams) => queryKeys.products.list(params),
  detail: (params: ProductDetailParams) =>
    queryKeys.products.detail(
      params.handle,
      params.region_id ?? "",
      params.country_code ?? DEFAULT_COUNTRY_CODE
    ),
}

async function getProducts(
  params: ProductListParams,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  return getProductsWithMeiliFallback(params, signal)
}

const productService: ProductService<
  StoreProduct,
  ProductListParams,
  ProductDetailParams
> = {
  getProducts,

  getProductsGlobal(params) {
    return getProducts(params, undefined)
  },

  async getProductByHandle(params) {
    const response = await sdk.store.product.list({
      handle: params.handle,
      limit: 1,
      fields: params.fields ?? PRODUCT_DETAILED_FIELDS,
      country_code: params.country_code ?? DEFAULT_COUNTRY_CODE,
      region_id: params.region_id,
      province: params.province,
      cart_id: params.cart_id,
    })

    return response.products?.[0] ?? null
  },
}

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
