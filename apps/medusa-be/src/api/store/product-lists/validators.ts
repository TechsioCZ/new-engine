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

const optionalEmailString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().email().optional()
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
    access_type: z.enum(["private", "public"]).optional().default("private"),
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
  StoreCreateProductListItemSchema.extend({
    quantity: z.number().int().min(1).optional(),
  })

export const StoreChangeProductListItemQuantitySchema = z
  .object({
    quantity: z
      .number()
      .int()
      .refine((value) => value !== 0, {
        error: () => "quantity must be a non-zero integer",
      }),
  })
  .strict()

export const StoreIncrementProductListItemQuantitySchema = z
  .object({
    quantity: z.number().int().min(1),
  })
  .strict()

export const StoreUpdateProductListItemSchema = z
  .object({
    metadata: metadataSchema,
    note: nullableTrimmedString,
    quantity: z.number().int().min(1).optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict()

export const StoreUpdateProductListSchema = z
  .object({
    access_type: z.enum(["private", "public"]).optional(),
    description: nullableTrimmedString,
    handle: optionalTrimmedString,
    metadata: metadataSchema,
    title: optionalTrimmedString,
  })
  .strict()

export const StoreCreateProductListCartSchema = z
  .object({
    country_code: optionalTrimmedString,
    email: optionalEmailString,
    region_id: optionalTrimmedString,
    sales_channel_id: optionalTrimmedString,
  })
  .strict()
  .refine((data) => data.region_id || data.country_code, {
    error: () => "region_id or country_code is required",
    path: ["region_id"],
  })

export const StoreDeleteProductListItemParamsSchema = z
  .object({
    id: z.string().trim().min(1),
    item_id: z.string().trim().min(1),
  })
  .strict()

export const StoreProductListParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict()

export const StoreProductListItemParamsSchema = z
  .object({
    id: z.string().trim().min(1),
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
export type StoreChangeProductListItemQuantitySchemaType = z.infer<
  typeof StoreChangeProductListItemQuantitySchema
>
export type StoreIncrementProductListItemQuantitySchemaType = z.infer<
  typeof StoreIncrementProductListItemQuantitySchema
>
export type StoreUpdateProductListItemSchemaType = z.infer<
  typeof StoreUpdateProductListItemSchema
>
export type StoreUpdateProductListSchemaType = z.infer<
  typeof StoreUpdateProductListSchema
>
export type StoreCreateProductListCartSchemaType = z.infer<
  typeof StoreCreateProductListCartSchema
>
export type StoreDeleteProductListItemParamsSchemaType = z.infer<
  typeof StoreDeleteProductListItemParamsSchema
>
export type StoreProductListParamsSchemaType = z.infer<
  typeof StoreProductListParamsSchema
>
export type StoreProductListItemParamsSchemaType = z.infer<
  typeof StoreProductListItemParamsSchema
>
