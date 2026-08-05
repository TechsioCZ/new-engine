import { z } from "@medusajs/framework/zod"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"

import { CATALOG_SORT_VALUES } from "./utils"

const multiValueParamSchema = z.union([z.string(), z.array(z.string())])

export const STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "metadata",
  "variants.id",
  "categories.id",
  "categories.name",
  "categories.handle",
  "brand.id",
  "brand.title",
  "brand.handle",
]

export const STORE_CATALOG_PRODUCTS_PRICING_FIELDS = [
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.calculated_price.currency_code",
  "variants.calculated_price.is_calculated_price_tax_inclusive",
  "variants.calculated_price.is_original_price_tax_inclusive",
]

const additionalAllowedFields = [
  ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
  "categories.parent_category_id",
  "measurement",
  "variants.measurement",
  "variants.calculated_price.price_per_unit",
]

export const STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS = [
  ...new Set([...listProductQueryConfig.defaults, ...additionalAllowedFields]),
]

export const StoreCatalogProductsSchema = z
  .object({
    brand: multiValueParamSchema.optional(),
    category_id: multiValueParamSchema.optional(),
    country_code: z.string().optional(),
    currency_code: z.string().optional(),
    fields: z.string().optional(),
    form: multiValueParamSchema.optional(),
    ingredient: multiValueParamSchema.optional(),
    limit: z.coerce.number().int().min(1).max(48).optional().default(12),
    page: z.coerce.number().int().min(1).optional().default(1),
    price_max: z.coerce.number().nonnegative().optional(),
    price_min: z.coerce.number().nonnegative().optional(),
    q: z.string().optional().default(""),
    region_id: z.string().optional(),
    sales_channel_id: multiValueParamSchema.optional(),
    sort: z.enum(CATALOG_SORT_VALUES).optional().default("recommended"),
    status: multiValueParamSchema.optional(),
  })
  .strict()

export type StoreCatalogProductsSchemaType = z.infer<
  typeof StoreCatalogProductsSchema
>
