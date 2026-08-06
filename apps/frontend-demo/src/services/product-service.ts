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
const SORT_ORDER_QUERY_KEY = "order"

/**
 * Transform raw product data from API
 */
const transformProduct = (
  product: HttpTypes.StoreProduct,
  withVariants = false,
): Product => {
  // Get primary variant (first one)
  const primaryVariant = product.variants?.[0]

  // Get price from primary variant
  const price = primaryVariant?.calculated_price?.calculated_amount ?? undefined
  const priceWithTax =
    primaryVariant?.calculated_price?.calculated_amount_with_tax ?? undefined

  // Since Store API doesn't provide real inventory data, we can't determine stock status
  // We'll default to true and let the detailed product page handle variant-specific availability
  const inStock = true

  const images =
    product.images !== undefined &&
    product.images !== null &&
    product.images.length > 2
      ? product.images.slice(0, 2)
      : product.images

  // Remove variants array from list results to reduce payload size.
  const { variants: productVariants, ...productWithoutVariants } = product
  const variants = withVariants ? productVariants : undefined

  return {
    ...productWithoutVariants,
    ...(variants !== undefined && { variants }),
    images,
    inStock,
    price,
    priceWithTax,
    primaryVariant,
    thumbnail: product.thumbnail,
  }
}

/**
 * Fetch products with filtering, pagination and sorting
 */
export const getProducts = async (
  params: ProductListParams = {},
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

  // Use either category parameter or filters.categories, not both.
  // An explicit non-empty category takes priority over filters.categories.
  let categoryIds = category
  if (categoryIds === undefined || categoryIds === "") {
    categoryIds = filters?.categories
  }

  // Build base query.
  const baseQuery: Record<string, unknown> = {
    country_code: country_code ?? "cz",
    fields,
    limit,
    offset,
    ...(q !== undefined && { q }),
    ...(categoryIds !== undefined && { category_id: categoryIds }),
    ...(region_id !== undefined && { region_id }),
  }

  // Add sorting.
  if (sort !== undefined && sort.length > 0) {
    const sortMap: Record<string, string> = {
      "name-asc": "title",
      "name-desc": "-title",
      newest: "id",
      "price-asc": "variants.prices.amount",
      "price-desc": "-variants.prices.amount",
    }
    baseQuery[SORT_ORDER_QUERY_KEY] = sortMap[sort] ?? sort
  }

  // Build query with server-side filters.
  const queryParams = buildMedusaQuery(filters, baseQuery)

  try {
    const response = await sdk.store.product.list(queryParams)

    if (!Array.isArray(response.products)) {
      console.error("[ProductService] Invalid response structure:", response)
      return { count: 0, limit, offset, products: [] }
    }

    const products = response.products.map((product) =>
      transformProduct(product, true),
    )
    const responseCount: unknown = response.count
    const count =
      typeof responseCount === "number" &&
      responseCount !== 0 &&
      !Number.isNaN(responseCount)
        ? responseCount
        : products.length

    return {
      count,
      limit,
      offset,
      products,
    }
  } catch (error) {
    console.error("[ProductService] Error fetching products:", error)
    throw error
  }
}

export const getProduct = async (
  handle: string,
  regionId?: string,
  countryCode?: string,
): Promise<Product> => {
  const response = await sdk.store.product.list({
    country_code: countryCode ?? "cz",
    // Use full fields for detail views.
    fields: DETAIL_FIELDS,
    handle,
    limit: 1,
    ...(regionId !== undefined && { region_id: regionId }),
  })

  const products = Array.isArray(response.products) ? response.products : []
  const [product] = products
  if (product === undefined) {
    throw new Error("Product not found")
  }

  return transformProduct(product, true)
}
