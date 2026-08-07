import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const graphDateSchema = z.union([z.date(), z.string(), z.null()])

const calculatedPriceProjectionSchema = z
  .object({
    calculated_amount: z.number(),
    calculated_amount_with_tax: z.number(),
    calculated_amount_without_tax: z.number(),
    currency_code: z.string(),
    is_calculated_price_tax_inclusive: z.boolean(),
    is_original_price_tax_inclusive: z.boolean(),
    original_amount: z.number(),
    original_amount_with_tax: z.number(),
    original_amount_without_tax: z.number(),
  })
  .partial()
  .loose()

const storeProductVariantProjectionSchema = z
  .object({
    calculated_price: calculatedPriceProjectionSchema.nullable(),
    id: z.string(),
    inventory_quantity: z.number().nullable(),
    manage_inventory: z.boolean().nullable(),
  })
  .partial()
  .loose()

const storeProductCategoryProjectionSchema = z
  .object({
    is_internal: z.boolean(),
  })
  .partial()
  .loose()

const storeProductProjectionSchema = z
  .object({
    categories: z.array(storeProductCategoryProjectionSchema).nullable(),
    created_at: graphDateSchema,
    deleted_at: graphDateSchema,
    description: z.string().nullable(),
    discountable: z.boolean(),
    external_id: z.string().nullable(),
    handle: z.string(),
    height: z.number().nullable(),
    hs_code: z.string().nullable(),
    id: z.string(),
    images: z.array(z.record(z.string(), z.unknown())).nullable(),
    is_giftcard: z.boolean(),
    length: z.number().nullable(),
    material: z.string().nullable(),
    mid_code: z.string().nullable(),
    options: z.array(z.record(z.string(), z.unknown())).nullable(),
    origin_country: z.string().nullable(),
    status: z.enum(["draft", "proposed", "published", "rejected"]),
    subtitle: z.string().nullable(),
    thumbnail: z.string().nullable(),
    title: z.string(),
    type_id: z.string().nullable(),
    updated_at: graphDateSchema,
    variants: z.array(storeProductVariantProjectionSchema).nullable(),
    weight: z.number().nullable(),
    width: z.number().nullable(),
  })
  .partial()
  .loose()

export type StoreProductProjection = z.infer<
  typeof storeProductProjectionSchema
>
export type StoreProductVariantProjection = z.infer<
  typeof storeProductVariantProjectionSchema
>
export type CalculatedPriceProjection = z.infer<
  typeof calculatedPriceProjectionSchema
>

const queryMetadataSchema = z
  .object({
    count: z.number().optional(),
    skip: z.number().optional(),
    take: z.number().optional(),
  })
  .loose()

const storeProductGraphResponseSchema = z
  .object({
    data: z.array(z.unknown()),
    metadata: z.unknown().optional(),
  })
  .loose()

export const parseStoreProductListGraphResponse = (value: unknown) => {
  const responseResult = storeProductGraphResponseSchema.safeParse(value)
  if (!responseResult.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned an invalid response.",
    )
  }

  const { data: rawProducts, metadata: rawMetadata } = responseResult.data
  const products: StoreProductProjection[] = []

  for (const rawProduct of rawProducts) {
    const productResult = storeProductProjectionSchema.safeParse(rawProduct)
    if (!productResult.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product query returned invalid store product data.",
      )
    }
    products.push(productResult.data)
  }

  const metadataResult = queryMetadataSchema.safeParse(rawMetadata)
  if (rawMetadata !== undefined && !metadataResult.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product query returned invalid pagination metadata.",
    )
  }

  return {
    metadata: metadataResult.success ? metadataResult.data : undefined,
    products,
  }
}

export const parseStoreProductDetailGraphResponse = (
  value: unknown,
  productId: string | undefined,
) => {
  const { products } = parseStoreProductListGraphResponse(value)
  const product = products.at(0)

  if (product === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${productId} was not found`,
    )
  }

  return product
}
