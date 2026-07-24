import type { HttpTypes } from "@medusajs/types"

import { sdk } from "@/lib/medusa-client"
import type { Product } from "@/types/product"
import { buildMedusaQuery } from "@/utils/server-filters"

export interface ProductFilters {
  categories?: string[]
  sizes?: string[]
  // search removed - use 'q' parameter directly
}

export interface ProductListParams {
  limit?: number | undefined
  offset?: number | undefined
  fields?: string | undefined
  filters?: ProductFilters | undefined
  category?: string | string[] | undefined
  sort?: string | undefined
  q?: string | undefined
  region_id?: string | undefined
  country_code?: string | undefined
}

export interface ProductListResponse {
  products: Product[]
  count: number
  limit: number
  offset: number
}

// Fields for product list views (minimal data)
const LIST_FIELDS = [
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
const DETAIL_FIELDS = [
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
export const getProducts = async (
  params: ProductListParams = {}
): Promise<ProductListResponse> => {
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
    fields,
    country_code: country_code ?? "cz",
    ...(q !== undefined && { q }),
    ...(categoryIds !== undefined && { category_id: categoryIds }),
    ...(region_id !== undefined && { region_id }),
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
    baseQuery["order"] = sortMap[sort] || sort
  }

  // Build query with server-side filters
  const queryParams = buildMedusaQuery(filters, baseQuery)

  try {
    const response = await sdk.store.product.list(queryParams)

    if (!response.products) {
      console.error("[ProductService] Invalid response structure:", response)
      return { products: [], count: 0, limit, offset }
    }

    const products = response.products.map((p) => transformProduct(p, true))

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

/**
 * Transform raw product data from API
 */
const transformProduct = (
  product: HttpTypes.StoreProduct,
  withVariants?: boolean
): Product => {
  if (!product) {
    throw new Error("Cannot transform null product")
  }

  // Get primary variant (first one)
  const primaryVariant = product.variants?.[0]

  // Get price from primary variant
  const price = primaryVariant?.calculated_price?.calculated_amount ?? undefined
  const priceWithTax =
    primaryVariant?.calculated_price?.calculated_amount_with_tax ?? undefined

  // Since Store API doesn't provide real inventory data, we can't determine stock status
  // We'll default to true and let the detailed product page handle variant-specific availability
  const inStock = true

  const reducedImages =
    product.images && product.images.length > 2 && product.images.slice(0, 2)

  // Remove variants array from list results to reduce payload size.
  const { variants: _variants, ...productWithoutVariants } = product
  const variants = withVariants ? product.variants : undefined

  return {
    ...productWithoutVariants,
    ...(variants !== undefined && { variants }),
    thumbnail: product.thumbnail,
    images: reducedImages || product.images,
    inStock,
    price,
    priceWithTax,
    primaryVariant,
  }
}

export async function getProduct(
  handle: string,
  region_id?: string,
  country_code?: string
): Promise<Product> {
  const response = await sdk.store.product.list({
    handle,
    fields: DETAIL_FIELDS, // Use full fields for detail views
    limit: 1,
    ...(region_id !== undefined && { region_id }),
    country_code: country_code ?? "cz",
  })

  const product = response.products?.[0]
  if (!product) {
    throw new Error("Product not found")
  }

  return transformProduct(product, true)
}
