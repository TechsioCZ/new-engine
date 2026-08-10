import { z } from "@medusajs/framework/zod"

import { JsonMetadataSchema } from "../../lib/json-metadata"

const nullableStringSchema = z
  .unknown()
  .transform((value) => (typeof value === "string" ? value : null))

const nullableJsonMetadataSchema = z.unknown().transform((value) => {
  const parsed = JsonMetadataSchema.safeParse(value)
  return parsed.success ? parsed.data : null
})

const existingProductVariantSchema = z.object({
  ean: nullableStringSchema,
  id: z.string(),
  sku: nullableStringSchema,
})

const normalizeExistingProductVariants = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return []
  }
  const variants: unknown[] = value
  return variants
}

const existingProductVariantsSchema = z.preprocess(
  normalizeExistingProductVariants,
  z.array(existingProductVariantSchema),
)

export const ExistingProductSchema = z.object({
  external_id: nullableStringSchema,
  id: z.string(),
  metadata: nullableJsonMetadataSchema,
  variants: existingProductVariantsSchema,
})

export type ExistingProduct = z.infer<typeof ExistingProductSchema>

export const ProductVariantReferenceSchema = z.object({
  ean: nullableStringSchema,
  product_id: z.string(),
  sku: nullableStringSchema,
})
