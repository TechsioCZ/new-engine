import type { HttpTypes } from "@medusajs/types"
import { getRecordValue, isRecord } from "@techsio/std/object"

import { PRODUCT_DETAILED_FIELDS } from "@/lib/constants"
import { fetchLogger } from "@/lib/loggers/fetch"
import { sdk } from "@/lib/medusa-client"
import { buildQueryString } from "@/lib/product-query-params"
import type { ProductQueryParams } from "@/lib/product-query-params"
import type {
  ProductListCalculatedPrice,
  ProductListProduct,
  ProductListVariant,
} from "@/types/product"

export interface ProductListResponse {
  products: ProductListProduct[]
  count: number
  limit: number
  offset: number
}

export interface ProductDetailParams {
  handle: string
  region_id?: string
  country_code?: string
  fields?: string
}

interface GetProductsErrorContext {
  category_id?: string[] | undefined
  limit?: number | undefined
  offset?: number | undefined
  signal?: AbortSignal | undefined
}

const decodeProductListCalculatedPrice = (
  value: unknown,
): ProductListCalculatedPrice | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const amountWithTax = getRecordValue(value, "calculated_amount_with_tax")
  const amountWithoutTax = getRecordValue(
    value,
    "calculated_amount_without_tax",
  )
  const currencyCode = getRecordValue(value, "currency_code")

  if (
    amountWithTax !== undefined &&
    amountWithTax !== null &&
    typeof amountWithTax !== "number"
  ) {
    return undefined
  }
  if (
    amountWithoutTax !== undefined &&
    amountWithoutTax !== null &&
    typeof amountWithoutTax !== "number"
  ) {
    return undefined
  }
  if (currencyCode !== null && typeof currencyCode !== "string") {
    return undefined
  }

  return {
    ...(amountWithTax === undefined
      ? {}
      : { calculated_amount_with_tax: amountWithTax }),
    ...(amountWithoutTax === undefined
      ? {}
      : { calculated_amount_without_tax: amountWithoutTax }),
    currency_code: currencyCode,
  }
}

const decodeProductListVariant = (
  value: unknown,
): ProductListVariant | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const calculatedPriceValue = getRecordValue(value, "calculated_price")
  const inventoryQuantity = getRecordValue(value, "inventory_quantity")
  const title = getRecordValue(value, "title")

  if (title !== null && typeof title !== "string") {
    return undefined
  }
  if (
    inventoryQuantity !== undefined &&
    inventoryQuantity !== null &&
    typeof inventoryQuantity !== "number"
  ) {
    return undefined
  }

  let calculatedPrice: ProductListCalculatedPrice | null | undefined
  if (calculatedPriceValue === null) {
    calculatedPrice = null
  } else if (calculatedPriceValue !== undefined) {
    calculatedPrice = decodeProductListCalculatedPrice(calculatedPriceValue)
    if (calculatedPrice === undefined) {
      return undefined
    }
  }

  return {
    ...(calculatedPrice === undefined
      ? {}
      : { calculated_price: calculatedPrice }),
    ...(inventoryQuantity === undefined
      ? {}
      : { inventory_quantity: inventoryQuantity }),
    title,
  }
}

const decodeProductListProduct = (
  value: unknown,
): ProductListProduct | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const handle = getRecordValue(value, "handle")
  const id = getRecordValue(value, "id")
  const thumbnail = getRecordValue(value, "thumbnail")
  const title = getRecordValue(value, "title")
  const variantsValue = getRecordValue(value, "variants")

  if (typeof handle !== "string" || typeof id !== "string") {
    return undefined
  }
  if (thumbnail !== null && typeof thumbnail !== "string") {
    return undefined
  }
  if (typeof title !== "string") {
    return undefined
  }
  if (variantsValue !== null && !Array.isArray(variantsValue)) {
    return undefined
  }

  if (variantsValue === null) {
    return { handle, id, thumbnail, title, variants: null }
  }

  const variantValues: unknown[] = variantsValue
  const variants: ProductListVariant[] = []
  for (const variantValue of variantValues) {
    const variant = decodeProductListVariant(variantValue)
    if (variant === undefined) {
      return undefined
    }
    variants.push(variant)
  }

  return { handle, id, thumbnail, title, variants }
}

interface DecodedProductListPayload {
  count: number
  products: ProductListProduct[]
}

const logMalformedProduct = (index: number): void => {
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[ProductService] Skipping malformed product at response index ${index}`,
    )
  }
}

const decodeProductListResponse = (
  value: unknown,
): DecodedProductListPayload => {
  if (!isRecord(value)) {
    return { count: 0, products: [] }
  }

  const count = getRecordValue(value, "count")
  const productsValue = getRecordValue(value, "products")
  if (
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0 ||
    !Array.isArray(productsValue)
  ) {
    return { count: 0, products: [] }
  }

  const productValues: unknown[] = productsValue
  const products: ProductListProduct[] = []
  for (const [index, productValue] of productValues.entries()) {
    const product = decodeProductListProduct(productValue)
    if (product === undefined) {
      logMalformedProduct(index)
      continue
    }
    products.push(product)
  }

  return { count, products }
}

const buildProductsQueryString = (params: ProductQueryParams): string => {
  const { category_id, country_code, fields, limit, offset, region_id } = params

  return buildQueryString({
    category_id,
    ...(country_code !== undefined && country_code.length > 0
      ? { country_code }
      : {}),
    fields,
    limit,
    offset,
    ...(region_id !== undefined && region_id.length > 0 ? { region_id } : {}),
  })
}

// Next rejects in-flight fetches once a prerender completes. It tags those
// with a stable digest, which is what Next's own
// isHangingPromiseRejectionError checks, so classify on that rather than on
// the human-readable message.
const isPrerenderCompletionError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  error.digest === "HANGING_PROMISE_REJECTION"

const handleGetProductsError = (
  error: unknown,
  context: GetProductsErrorContext,
): ProductListResponse => {
  const { category_id, limit, offset, signal } = context
  const isAbortError = error instanceof Error && error.name === "AbortError"

  // Request cancellations are expected (navigation, Suspense and prerender
  // completion). Return empty data so the UI can continue and client queries
  // can refetch.
  if (
    signal?.aborted === true ||
    isAbortError ||
    isPrerenderCompletionError(error)
  ) {
    if (process.env.NODE_ENV === "development") {
      const categorySlice = category_id?.[0]?.slice(-6)
      const categoryLabel =
        categorySlice !== undefined && categorySlice.length > 0
          ? categorySlice
          : "all"
      fetchLogger.cancelled(categoryLabel, offset)
    }

    return {
      count: 0,
      limit: limit ?? 0,
      offset: offset ?? 0,
      products: [],
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[ProductService] Failed to fetch products:", error)
  }
  const message = error instanceof Error ? error.message : "Unknown error"
  throw new Error(`Failed to fetch products: ${message}`, { cause: error })
}

export const getProducts = async (
  params: ProductQueryParams,
  signal?: AbortSignal,
): Promise<ProductListResponse> => {
  const { category_id, limit, offset } = params

  try {
    const queryString = buildProductsQueryString(params)

    const response = await sdk.client.fetch<unknown>(
      `/store/products?${queryString}`,
      signal === undefined ? undefined : { signal },
    )
    const payload = decodeProductListResponse(response)

    return {
      count: payload.count,
      limit: limit ?? 0,
      offset: offset ?? 0,
      products: payload.products,
    }
  } catch (error) {
    return handleGetProductsError(error, { category_id, limit, offset, signal })
  }
}

/**
 * Fetch products without AbortSignal (for global/persistent prefetch)
 * Use for root categories that should complete even after navigation
 */
export const getProductsGlobal = async (
  params: ProductQueryParams,
): Promise<ProductListResponse> => await getProducts(params)

export const getProductByHandle = async (
  params: ProductDetailParams,
): Promise<HttpTypes.StoreProduct | null> => {
  const { handle, region_id, country_code } = params

  try {
    const response = await sdk.store.product.list({
      fields: PRODUCT_DETAILED_FIELDS,
      handle,
      limit: 1,
      ...(country_code !== undefined && country_code.length > 0
        ? { country_code }
        : {}),
      ...(region_id !== undefined && region_id.length > 0 ? { region_id } : {}),
    })

    return response.products?.[0] ?? null
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[ProductService] Failed to fetch product by handle:",
        error,
      )
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch product: ${message}`, { cause: error })
  }
}
