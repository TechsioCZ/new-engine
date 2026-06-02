import { z } from "@medusajs/framework/zod"

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional()
)

const nullableTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? null : value,
  z.string().trim().min(1).nullable().optional()
)

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()

export const StoreGetProductListsSchema = z
  .object({
    handle: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    type: z.enum(["favorite", "custom"]).optional(),
  })
  .strict()

export const StoreCreateFavoriteProductListSchema = z
  .object({
    description: nullableTrimmedString,
    handle: optionalTrimmedString,
    metadata: metadataSchema,
    title: optionalTrimmedString,
  })
  .strict()

export const StoreCreateCustomProductListSchema = z
  .object({
    description: nullableTrimmedString,
    handle: optionalTrimmedString,
    metadata: metadataSchema,
    title: z.string().trim().min(1),
  })
  .strict()

export const StoreCreateProductListItemSchema = z
  .object({
    metadata: metadataSchema,
    note: nullableTrimmedString,
    product_id: z.string().trim().min(1),
    quantity: z.number().int().min(1).optional(),
    sort_order: z.number().int().min(0).optional(),
    variant_id: optionalTrimmedString,
  })
  .strict()

export const StoreCreateFavoriteProductListItemSchema =
  StoreCreateProductListItemSchema.omit({ quantity: true })

export const StoreIncrementProductListItemSchema = z
  .object({
    quantity: z.number().int().min(1).optional().default(1),
  })
  .strict()

export type StoreGetProductListsSchemaType = z.infer<
  typeof StoreGetProductListsSchema
>
export type StoreCreateFavoriteProductListSchemaType = z.infer<
  typeof StoreCreateFavoriteProductListSchema
>
export type StoreCreateCustomProductListSchemaType = z.infer<
  typeof StoreCreateCustomProductListSchema
>
export type StoreCreateProductListItemSchemaType = z.infer<
  typeof StoreCreateProductListItemSchema
>
export type StoreCreateFavoriteProductListItemSchemaType = z.infer<
  typeof StoreCreateFavoriteProductListItemSchema
>
export type StoreIncrementProductListItemSchemaType = z.infer<
  typeof StoreIncrementProductListItemSchema
>
