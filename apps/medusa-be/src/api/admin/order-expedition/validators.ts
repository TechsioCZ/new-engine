import { z } from "@medusajs/framework/zod"
import { createOperatorMap } from "@medusajs/medusa/api/utils/validators"
import {
  ORDER_BUSINESS_STATUS_GROUP_IDS,
  ORDER_BUSINESS_STATUS_IDS,
} from "../../../utils/order-business-status"
import {
  ORDER_EXPEDITION_CARRIER_KEYS,
  ORDER_EXPEDITION_MAX_LIMIT,
  ORDER_EXPEDITION_MAX_ORDER_IDS,
  ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS,
  ORDER_EXPEDITION_SORT_QUERY_VALUES,
  ORDER_EXPEDITION_TARGET_STATUSES,
} from "../../../utils/order-expedition"

const OptionalNonNegativeIntQuerySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.coerce.number().int().min(0).optional()
)

const OptionalLimitQuerySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.coerce.number().int().min(1).max(ORDER_EXPEDITION_MAX_LIMIT).optional()
)

const OptionalOrderQuerySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.enum(ORDER_EXPEDITION_SORT_QUERY_VALUES).optional()
)

const OptionalBooleanQuerySchema = z.preprocess((value) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value

  if (normalizedValue === "true") {
    return true
  }

  if (normalizedValue === "false") {
    return false
  }

  return normalizedValue
}, z.boolean().optional())

export const GetAdminOrderExpeditionOrdersSchema = z.object({
  business_status_group: z.enum(ORDER_BUSINESS_STATUS_GROUP_IDS).optional(),
  business_status: z.enum(ORDER_BUSINESS_STATUS_IDS).optional(),
  carrier: z.enum(ORDER_EXPEDITION_CARRIER_KEYS).optional(),
  created_at: createOperatorMap().optional(),
  limit: OptionalLimitQuerySchema,
  offset: OptionalNonNegativeIntQuerySchema,
  order: OptionalOrderQuerySchema,
  pending_unpaid: OptionalBooleanQuerySchema,
  q: z.string().optional(),
})

export const PostAdminOrderExpeditionPdfSchema = z
  .object({
    mode: z.enum(["combined", "separate"]).default("combined"),
    order_ids: z
      .array(z.string().min(1))
      .min(1)
      .max(ORDER_EXPEDITION_MAX_ORDER_IDS),
  })
  .refine(
    ({ mode, order_ids: orderIds }) =>
      mode !== "separate" ||
      orderIds.length <= ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS,
    {
      message: `Separate PDF export supports at most ${ORDER_EXPEDITION_MAX_SEPARATE_PDF_ORDER_IDS} orders`,
      path: ["order_ids"],
    }
  )

export const PostAdminOrderExpeditionFulfillmentSchema = z.object({
  location_id: z.string().min(1),
  no_notification: z.boolean().optional(),
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

export type PostAdminOrderExpeditionFulfillmentSchemaType = z.infer<
  typeof PostAdminOrderExpeditionFulfillmentSchema
>

export type PostAdminOrderExpeditionStatusSchemaType = z.infer<
  typeof PostAdminOrderExpeditionStatusSchema
>
