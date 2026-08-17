import { z } from "@medusajs/framework/zod"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"
import {
  normalizeProductSaleAdapterSelectionInput,
  PRODUCT_SALE_ADAPTER_NAMES,
} from "../../../../utils/product-sale-adapters"
import { CATALOG_SORT_VALUES } from "./utils"

const multiValueParamSchema = z.union([z.string(), z.array(z.string())])
const onSaleParamSchema = z.preprocess(
  normalizeProductSaleAdapterSelectionInput,
  z
    .union([
      z.literal(true),
      z.array(z.enum(PRODUCT_SALE_ADAPTER_NAMES)).min(1),
    ])
    .optional()
)

export const STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "metadata",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.ean",
  "variants.upc",
  "variants.barcode",
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
  "sale_adapters",
  "categories.parent_category_id",
  "measurement",
  "variants.measurement",
  "variants.calculated_price.price_per_unit",
]

export const STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS = Array.from(
  new Set([...listProductQueryConfig.defaults, ...additionalAllowedFields])
)

export const StoreCatalogProductsSchema = z
  .object({
    fields: z.string().optional(),
    q: z.string().optional().default(""),
    profile: z.string().trim().min(1).max(120).optional(),
    locale: z.string().trim().min(2).max(20).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(48).optional().default(12),
    sort: z.enum(CATALOG_SORT_VALUES).optional().default("recommended"),
    region_id: z.string().optional(),
    currency_code: z.string().optional(),
    country_code: z.string().optional(),
    sales_channel_id: multiValueParamSchema.optional(),
    category_id: multiValueParamSchema.optional(),
    status: multiValueParamSchema.optional(),
    form: multiValueParamSchema.optional(),
    brand: multiValueParamSchema.optional(),
    ingredient: multiValueParamSchema.optional(),
    on_sale: onSaleParamSchema,
    price_min: z.coerce.number().nonnegative().optional(),
    price_max: z.coerce.number().nonnegative().optional(),
  })
  .strict()

export type StoreCatalogProductsSchemaType = z.infer<
  typeof StoreCatalogProductsSchema
>
