import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { ProductListResponse, ProductService } from "./types"

type MedusaProductListQuery = HttpTypes.StoreProductListParams &
  Record<string, unknown>

export type MedusaProductListInput = HttpTypes.StoreProductListParams

export type MedusaProductDetailInput = {
  handle: string
  region_id?: string
  country_code?: string
  province?: string
  cart_id?: string
  locale?: string
  fields?: string
}

export type MedusaProductTransformListContext<
  TListParams extends MedusaProductListInput,
> = {
  params: TListParams
  query: MedusaProductListQuery
  response: HttpTypes.StoreProductListResponse
}

export type MedusaProductTransformDetailContext<
  TDetailParams extends MedusaProductDetailInput,
> = {
  params: TDetailParams
  query: MedusaProductListQuery
  response: HttpTypes.StoreProductListResponse
}

export type MedusaProductServiceConfig<
  TProduct,
  TListParams extends MedusaProductListInput,
  TDetailParams extends MedusaProductDetailInput,
> = {
  listPath?: string
  defaultListFields?: string
  defaultDetailFields?: string
  normalizeListQuery?: (params: TListParams) => MedusaProductListQuery
  normalizeDetailQuery?: (params: TDetailParams) => MedusaProductListQuery
  transformProduct?: (product: HttpTypes.StoreProduct) => TProduct
  transformListProduct?: (
    product: HttpTypes.StoreProduct,
    context: MedusaProductTransformListContext<TListParams>
  ) => TProduct
  transformDetailProduct?: (
    product: HttpTypes.StoreProduct,
    context: MedusaProductTransformDetailContext<TDetailParams>
  ) => TProduct
  createGlobalFetcher?: boolean
}

const normalizeCountryCode = (
  query: MedusaProductListQuery
): MedusaProductListQuery => {
  const countryCode = query.country_code
  if (typeof countryCode === "string") {
    return {
      ...query,
      country_code: countryCode.toLowerCase(),
    }
  }
  return query
}

const toListResponse = <TProduct>(
  response: HttpTypes.StoreProductListResponse,
  query: MedusaProductListQuery,
  products: TProduct[]
): ProductListResponse<TProduct> => {
  const queryLimit = query.limit
  const queryOffset = query.offset

  return {
    products,
    count: response.count ?? products.length,
    limit:
      response.limit ??
      (typeof queryLimit === "number" ? queryLimit : products.length),
    offset:
      response.offset ?? (typeof queryOffset === "number" ? queryOffset : 0),
  }
}

/**
 * Creates a ProductService for Medusa Store API.
 *
 * Uses `/store/products` through `sdk.client.fetch` so query cancellation works
 * with `AbortSignal` passed by TanStack Query.
 *
 * @example
 * ```typescript
 * import { createMedusaProductService, createProductHooks } from "@techsio/storefront-data"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const service = createMedusaProductService(sdk, {
 *   defaultListFields: "id,title,handle,thumbnail",
 *   defaultDetailFields: "id,title,handle,description,*variants.calculated_price",
 * })
 *
 * const productHooks = createProductHooks({
 *   service,
 *   queryKeyNamespace: "my-app",
 * })
 * ```
 */
export function createMedusaProductService<
  TProduct = HttpTypes.StoreProduct,
  TListParams extends MedusaProductListInput = MedusaProductListInput,
  TDetailParams extends MedusaProductDetailInput = MedusaProductDetailInput,
>(
  sdk: Medusa,
  config?: MedusaProductServiceConfig<TProduct, TListParams, TDetailParams>
): ProductService<TProduct, TListParams, TDetailParams> {
  const {
    listPath = "/store/products",
    defaultListFields,
    defaultDetailFields,
    normalizeListQuery,
    normalizeDetailQuery,
    transformProduct,
    transformListProduct,
    transformDetailProduct,
    createGlobalFetcher = true,
  } = config ?? {}

  const baseTransform =
    transformProduct ?? ((product) => product as unknown as TProduct)

  const mapListProduct: (
    product: HttpTypes.StoreProduct,
    context: MedusaProductTransformListContext<TListParams>
  ) => TProduct =
    transformListProduct ??
    ((product: HttpTypes.StoreProduct) => baseTransform(product))

  const mapDetailProduct: (
    product: HttpTypes.StoreProduct,
    context: MedusaProductTransformDetailContext<TDetailParams>
  ) => TProduct =
    transformDetailProduct ??
    ((product: HttpTypes.StoreProduct) => baseTransform(product))

  const buildListQuery = (params: TListParams): MedusaProductListQuery => {
    const query = normalizeListQuery
      ? normalizeListQuery(params)
      : ({
          ...params,
          ...(defaultListFields && !params.fields
            ? { fields: defaultListFields }
            : {}),
        } as MedusaProductListQuery)

    return normalizeCountryCode(query)
  }

  const buildDetailQuery = (params: TDetailParams): MedusaProductListQuery => {
    const query = normalizeDetailQuery
      ? normalizeDetailQuery(params)
      : ({
          handle: params.handle,
          limit: 1,
          region_id: params.region_id,
          country_code: params.country_code,
          province: params.province,
          cart_id: params.cart_id,
          locale: params.locale,
          ...(params.fields || defaultDetailFields
            ? { fields: params.fields ?? defaultDetailFields }
            : {}),
        } as MedusaProductListQuery)

    return normalizeCountryCode(query)
  }

  const getProducts = async (
    params: TListParams,
    signal?: AbortSignal
  ): Promise<ProductListResponse<TProduct>> => {
    const query = buildListQuery(params)
    const response = await sdk.client.fetch<HttpTypes.StoreProductListResponse>(
      listPath,
      { query, signal }
    )

    const products = (response.products ?? []).map((product) =>
      mapListProduct(product, { params, query, response })
    )

    return toListResponse(response, query, products)
  }

  const getProductsGlobal = createGlobalFetcher
    ? async (params: TListParams) => getProducts(params, undefined)
    : undefined

  return {
    getProducts,
    getProductsGlobal,
    async getProductByHandle(
      params: TDetailParams,
      signal?: AbortSignal
    ): Promise<TProduct | null> {
      const query = buildDetailQuery(params)
      const response = await sdk.client.fetch<HttpTypes.StoreProductListResponse>(
        listPath,
        { query, signal }
      )
      const product = response.products?.[0]
      if (!product) {
        return null
      }
      return mapDetailProduct(product, { params, query, response })
    },
  }
}
