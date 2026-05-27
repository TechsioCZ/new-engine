import { z } from "@medusajs/framework/zod"

const PRODUCTS_BATCH_MAX = 500
const PRODUCT_CATEGORIES_MAX = 50
const PRODUCT_IMAGES_MAX = 50
const PRODUCT_BASE_PRICES_MAX = 50
const VARIANTS_PER_PRODUCT_MAX = 100
const VARIANT_PRICES_MAX = 50

const PriceSchema = z.object({
  currency_code: z
    .string()
    .min(3)
    .max(3)
    .transform((value) => value.toLowerCase()),
  amount: z.number().nonnegative(),
})

const CategoryRefSchema = z
  .object({
    handle: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.handle ?? value.name), {
    message: "Either category handle or name must be provided",
  })

const ImageSchema = z.object({
  url: z.string().url(),
})

const VariantInputSchema = z
  .object({
    identifier_type: z.enum(["sku", "ean", "variant_id"]),
    sku: z.string().min(1).optional(),
    ean: z.string().min(1).optional(),
    variant_id: z.string().min(1).optional(),
    title: z.string().min(1),
    manage_inventory: z.boolean().default(true),
    vat_rate: z.number().nonnegative().optional(),
    prices: z.array(PriceSchema).max(VARIANT_PRICES_MAX).optional(),
    options: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "sku" && !value.sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sku is required when variant identifier_type is 'sku'",
        path: ["sku"],
      })
    }
    if (value.identifier_type === "ean" && !value.ean) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ean is required when variant identifier_type is 'ean'",
        path: ["ean"],
      })
    }
    if (value.identifier_type === "variant_id" && !value.variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "variant_id is required when variant identifier_type is 'variant_id'",
        path: ["variant_id"],
      })
    }
  })

const ProductInputSchema = z
  .object({
    identifier_type: z.enum(["sku", "ean", "erp_id"]),
    sku: z.string().min(1).optional(),
    ean: z.string().min(1).optional(),
    erp_id: z.string().min(1).optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    handle: z.string().min(1).optional(),
    status: z.enum(["published", "draft"]).default("published"),
    discountable: z.boolean().default(true),
    weight: z.number().int().nonnegative().optional(),
    hs_code: z.string().optional(),
    categories: z
      .array(CategoryRefSchema)
      .max(PRODUCT_CATEGORIES_MAX)
      .optional(),
    images: z.array(ImageSchema).max(PRODUCT_IMAGES_MAX).optional(),
    base_prices: z.array(PriceSchema).max(PRODUCT_BASE_PRICES_MAX).optional(),
    variants: z
      .array(VariantInputSchema)
      .max(VARIANTS_PER_PRODUCT_MAX)
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "sku" && !value.sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sku is required when product identifier_type is 'sku'",
        path: ["sku"],
      })
    }
    if (value.identifier_type === "ean" && !value.ean) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ean is required when product identifier_type is 'ean'",
        path: ["ean"],
      })
    }
    if (value.identifier_type === "erp_id" && !value.erp_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "erp_id is required when product identifier_type is 'erp_id'",
        path: ["erp_id"],
      })
    }
  })

export const UpsertProductsBatchSchema = z.object({
  products: z.array(ProductInputSchema).min(1).max(PRODUCTS_BATCH_MAX),
})

export type UpsertProductsBatchSchemaType = z.infer<
  typeof UpsertProductsBatchSchema
>
export type ProductInputType = z.infer<typeof ProductInputSchema>
export type VariantInputType = z.infer<typeof VariantInputSchema>
export type PriceInputType = z.infer<typeof PriceSchema>
export type CategoryRefInputType = z.infer<typeof CategoryRefSchema>
