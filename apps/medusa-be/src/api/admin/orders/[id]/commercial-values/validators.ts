import { z } from "@medusajs/framework/zod"

export const CommercialValuesDiscountIntentSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("percentage"),
      value_bps: z.number().int().min(0).max(10_000),
    }),
    z.object({
      amount: z.number().finite().min(0),
      type: z.literal("amount"),
    }),
  ]
)

export const PostAdminOrderCommercialValuesPreviewSchema = z.object({
  expected_order_version: z.number().int().min(0),
  internal_note: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        discount: CommercialValuesDiscountIntentSchema.nullish(),
        item_id: z.string().min(1),
        unit_price: z.number().finite().min(0),
      })
    )
    .min(1),
  order_discount: CommercialValuesDiscountIntentSchema.nullish(),
})

export type PostAdminOrderCommercialValuesPreviewSchemaType = z.infer<
  typeof PostAdminOrderCommercialValuesPreviewSchema
>

export const PostAdminOrderCommercialValuesConfirmSchema =
  PostAdminOrderCommercialValuesPreviewSchema.extend({
    confirmation_mode: z.enum(["confirm", "request"]).optional(),
  })

export type PostAdminOrderCommercialValuesConfirmSchemaType = z.infer<
  typeof PostAdminOrderCommercialValuesConfirmSchema
>
