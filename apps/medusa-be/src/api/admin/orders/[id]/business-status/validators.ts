import { z } from "@medusajs/framework/zod"
import { ASSIGNABLE_ORDER_BUSINESS_STATUS_IDS } from "../../../../../utils/order-business-status"

export const PostAdminOrderBusinessStatusSchema = z
  .object({
    status: z.enum(ASSIGNABLE_ORDER_BUSINESS_STATUS_IDS).nullable(),
  })
  .strict()

export type PostAdminOrderBusinessStatusSchemaType = z.infer<
  typeof PostAdminOrderBusinessStatusSchema
>
