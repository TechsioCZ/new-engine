import { z } from "@medusajs/framework/zod"
import {
  ORDER_EXPEDITION_CARRIER_KEYS,
  ORDER_EXPEDITION_MAX_LIMIT,
  ORDER_EXPEDITION_MAX_ORDER_IDS,
  ORDER_EXPEDITION_TARGET_STATUSES,
} from "../../../utils/order-expedition"

const OptionalPositiveIntQuerySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.coerce.number().int().min(0).optional()
)

const OptionalLimitQuerySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.coerce.number().int().min(1).max(ORDER_EXPEDITION_MAX_LIMIT).optional()
)

export const GetAdminOrderExpeditionOrdersSchema = z.object({
  carrier: z.enum(ORDER_EXPEDITION_CARRIER_KEYS).optional(),
  limit: OptionalLimitQuerySchema,
  offset: OptionalPositiveIntQuerySchema,
})

export const PostAdminOrderExpeditionPdfSchema = z.object({
  order_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(ORDER_EXPEDITION_MAX_ORDER_IDS),
})

export const PostAdminOrderExpeditionStatusSchema = z.object({
  order_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(ORDER_EXPEDITION_MAX_ORDER_IDS),
  target_status: z.enum(ORDER_EXPEDITION_TARGET_STATUSES),
})

export type GetAdminOrderExpeditionOrdersSchemaType = z.infer<
  typeof GetAdminOrderExpeditionOrdersSchema
>

export type PostAdminOrderExpeditionPdfSchemaType = z.infer<
  typeof PostAdminOrderExpeditionPdfSchema
>

export type PostAdminOrderExpeditionStatusSchemaType = z.infer<
  typeof PostAdminOrderExpeditionStatusSchema
>
