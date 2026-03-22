import type { HttpTypes } from "@medusajs/types"
import { findPreferredVariant } from "@/lib/inventory"
import { sdk } from "@/lib/medusa-client"
import type { Product } from "@/types/product"
import { buildMedusaQuery } from "@/utils/server-filters"

export type ProductFilters = {
  categories?: string[]
  sizes?: string[]
  // search removed - use 'q' parameter directly
}

export type ProductListParams = {
  limit?: number
  offset?: number
  fields?: string
  filters?: ProductFilters
  category?: string | string[]
  sort?: string
  q?: string
  region_id?: string
  country_code?: string
}

export type ProductListResponse = {
  products: Product[]
  count: number
  limit: number
  offset: number
}

// Fields for product list views (minimal data)
export const LIST_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "variants.title",
  "*variants.calculated_price",
  "variants.inventory_quantity",
  "variants.manage_inventory",
].join(",")

// Fields for product detail views (all data)
export const DETAIL_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "status",
  "collection_id",
  "created_at",
  "updated_at",
  "tags",
  "images.id",
  "images.url",
  "categories.id",
  "categories.name",
  "categories.handle",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "+variants.inventory_quantity",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.calculated_price",
  "variants.options",
].join(",")

/**
 * Fetch products with filtering, pagination and sorting
 */
export const buildProductListQuery = (params: ProductListParams = {}) => {
  const {
    limit = 20,
    offset = 0,
    filters,
    category,
    fields = LIST_FIELDS,
    sort,
    q,
    region_id,
    country_code,
  } = params

  // Use either category parameter OR filters.categories, not both
  // Priority: explicit category param > filters.categories
  const categoryIds = category || filters?.categories

  // Build base query
  const baseQuery: Record<string, unknown> = {
    limit,
    offset,
    q,
    category_id: categoryIds,
    fields,
    ...(region_id && { region_id }),
    ...(country_code ? { country_code } : {}),
  }

  // Add sorting
  if (sort) {
    const sortMap: Record<string, string> = {
      newest: "id",
      "price-asc": "variants.prices.amount",
      "price-desc": "-variants.prices.amount",
      "name-asc": "title",
      "name-desc": "-title",
    }
    baseQuery.order = sortMap[sort] || sort
  }

  // Build query with server-side filters
  const queryParams = buildMedusaQuery(filters, baseQuery)

  return queryParams
}

export const buildProductDetailQuery = (
  handle: string,
  region_id?: string,
  country_code?: string
) => ({
  handle,
  fields: DETAIL_FIELDS,
  limit: 1,
  ...(region_id ? { region_id } : {}),
  ...(country_code ? { country_code } : {}),
})

/**
 * Transform raw product data from API
 */
export const transformProduct = (
  product: HttpTypes.StoreProduct,
  withVariants = true
): Product => {
  if (!product) {
    throw new Error("Cannot transform null product")
  }

  const primaryVariant = findPreferredVariant(product.variants)

  // Get price from primary variant
  const price = primaryVariant?.calculated_price?.calculated_amount
  const priceWithTax =
    primaryVariant?.calculated_price?.calculated_amount_with_tax

  // Since Store API doesn't provide real inventory data, we can't determine stock status
  // We'll default to true and let the detailed product page handle variant-specific availability
  const inStock = true

  const reducedImages =
    product.images && product.images.length > 2 && product.images.slice(0, 2)

  // Remove variants array from the result to reduce payload size
  const productWithoutVariants = { ...product }
  productWithoutVariants.variants = undefined

  const result = withVariants ? product : productWithoutVariants

  return {
    ...result,
    thumbnail: product.thumbnail,
    images: reducedImages || product.images,
    inStock,
    price,
    priceWithTax,
    primaryVariant,
  } as Product
}

/**
 * Fetch products with filtering, pagination and sorting
 */
export const getProducts = async (
  params: ProductListParams = {}
): Promise<ProductListResponse> => {
  const queryParams = {
    ...buildProductListQuery(params),
    country_code: params.country_code ?? "cz",
  }
  const limit = queryParams.limit ?? 20
  const offset = queryParams.offset ?? 0

  try {
    const response = await sdk.store.product.list(queryParams)

    if (!response.products) {
      console.error("[ProductService] Invalid response structure:", response)
      return { products: [], count: 0, limit, offset }
    }

    const products = response.products.map((product) =>
      transformProduct(product, true)
    )

    return {
      products,
      count: response.count || products.length,
      limit,
      offset,
    }
  } catch (error) {
    console.error("[ProductService] Error fetching products:", error)
    throw error
  }
}

export async function getProduct(
  handle: string,
  region_id?: string,
  country_code?: string
): Promise<Product> {
  const response = await sdk.store.product.list({
    ...buildProductDetailQuery(handle, region_id, country_code),
    country_code: country_code ?? "cz",
  })

  if (!response.products?.length) {
    throw new Error("Product not found")
  }

  return transformProduct(response.products[0], true)
}
