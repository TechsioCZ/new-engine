import type { HttpTypes } from "@medusajs/types"

export const DEFAULT_PRODUCT_PAGE_SIZE = 12

export const VARIANT_DEFAULT_STOCK_INVENTORY_FIELD_SUFFIXES = [
  "inventory_items.inventory_item_id",
  "inventory_items.required_quantity",
  "inventory_items.inventory.location_levels.*",
  "inventory_items.inventory.location_levels.stock_locations.name",
] as const

export const PRODUCT_VARIANT_INVENTORY_FIELDS = [
  "+variants.inventory_quantity",
  "+variants.manage_inventory",
  "+variants.allow_backorder",
  ...VARIANT_DEFAULT_STOCK_INVENTORY_FIELD_SUFFIXES.map(
    (field) => `variants.${field}`
  ),
].join(",")

export const PRODUCT_BRAND_GPSR_FIELDS = [
  "brand.gpsr_contact_email",
  "brand.gpsr_european_reseller_contact_email",
  "brand.gpsr_european_reseller_manufacturing_company_name",
  "brand.gpsr_european_reseller_postal_address",
  "brand.gpsr_manufactured_outside_eu",
  "brand.gpsr_manufacturing_company_name",
  "brand.gpsr_postal_address",
] as const

export const PRODUCT_CARD_FIELDS = `id,title,handle,thumbnail,*variants.calculated_price,${PRODUCT_VARIANT_INVENTORY_FIELDS},+metadata`

export const ACCOUNT_PRODUCT_LIST_FIELDS = `${PRODUCT_CARD_FIELDS},variants.id,variants.title`

export const SEARCH_PRODUCT_CARD_FIELDS = PRODUCT_CARD_FIELDS

export const RELATED_PRODUCT_FIELDS = PRODUCT_CARD_FIELDS

export const PRODUCT_DETAIL_FIELDS = `${PRODUCT_CARD_FIELDS},description,images.url,categories.id,categories.name,categories.handle,categories.parent_category_id,brand.id,brand.title,brand.handle,${PRODUCT_BRAND_GPSR_FIELDS.join(",")},options.id,options.title,variants.id,variants.title,variants.sku,variants.ean,variants.options.value,variants.options.option_id,+variants.metadata,+variants.calculated_price.price_per_unit`

export type StorefrontProductListInput = HttpTypes.StoreProductListParams & {
  handle?: string | string[]
  page?: number
}

export const buildProductListParams = (
  input: StorefrontProductListInput
): HttpTypes.StoreProductListParams => {
  const { page, limit, offset, ...rest } = input

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PRODUCT_PAGE_SIZE
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1

  const params: Record<string, unknown> = {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  }

  const categoryIds = params.category_id
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    // Medusa Store parser accepts multi-value `category_id[]` as CSV.
    params["category_id[]"] = categoryIds.join(",")
    params.category_id = undefined
  }

  const handles = params.handle
  if (Array.isArray(handles) && handles.length > 0) {
    params["handle[]"] = handles.join(",")
    params.handle = undefined
  }

  const externalIds = params.external_id
  if (Array.isArray(externalIds) && externalIds.length > 0) {
    params["external_id[]"] = externalIds.join(",")
    params.external_id = undefined
  }

  return params as HttpTypes.StoreProductListParams
}
