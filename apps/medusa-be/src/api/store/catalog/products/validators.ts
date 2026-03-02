import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"
import { z } from "zod"
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
  "producer.id",
  "producer.title",
  "producer.handle",
]

export const STORE_CATALOG_PRODUCTS_PRICING_FIELDS = [
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.calculated_price.currency_code",
]

const additionalAllowedFields = [
  ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
  "categories.parent_category_id",
]

export const STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS = Array.from(
  new Set([...listProductQueryConfig.defaults, ...additionalAllowedFields])
)

export const StoreCatalogProductsSchema = z
  .object({
    q: z.string().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(48).optional().default(12),
    sort: z.enum(CATALOG_SORT_VALUES).optional().default("recommended"),
    region_id: z.string().optional(),
    currency_code: z.string().optional(),
    country_code: z.string().optional(),
    category_id: multiValueParamSchema.optional(),
    status: multiValueParamSchema.optional(),
    form: multiValueParamSchema.optional(),
    brand: multiValueParamSchema.optional(),
    ingredient: multiValueParamSchema.optional(),
    price_min: z.coerce.number().nonnegative().optional(),
    price_max: z.coerce.number().nonnegative().optional(),
  })
  .strict()

export type StoreCatalogProductsSchemaType = z.infer<
  typeof StoreCatalogProductsSchema
>
