import { buildMedusaQuery } from "@/utils/server-filters"

export type ProductFilters = {
  categories?: string[]
  sizes?: string[]
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

export const PRODUCT_LIST_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "variants.title",
  "*variants.calculated_price",
  "variants.inventory_quantity",
  "variants.manage_inventory",
].join(",")

export const PRODUCT_DETAIL_FIELDS = [
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

export const buildProductListQuery = (params: ProductListParams = {}) => {
  const {
    limit = 20,
    offset = 0,
    filters,
    category,
    fields = PRODUCT_LIST_FIELDS,
    sort,
    q,
    region_id,
    country_code,
  } = params

  const categoryIds = category || filters?.categories

  const baseQuery: Record<string, unknown> = {
    limit,
    offset,
    q,
    category_id: categoryIds,
    fields,
    ...(region_id && { region_id }),
    ...(country_code ? { country_code } : {}),
  }

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

  return buildMedusaQuery(filters, baseQuery)
}

export const buildProductDetailQuery = (
  handle: string,
  region_id?: string,
  country_code?: string
) => ({
  handle,
  fields: PRODUCT_DETAIL_FIELDS,
  limit: 1,
  ...(region_id ? { region_id } : {}),
  ...(country_code ? { country_code } : {}),
})
