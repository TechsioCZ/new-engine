import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

export const productListMetadataSchema = z.record(z.string(), z.json())

export type ProductListMetadata = z.infer<typeof productListMetadataSchema>

export const parseProductListMetadata = (
  value: unknown,
): ProductListMetadata | null => {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = productListMetadataSchema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product list metadata is invalid",
    )
  }

  return parsed.data
}
