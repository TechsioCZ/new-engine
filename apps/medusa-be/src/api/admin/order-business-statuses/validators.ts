import { z } from "@medusajs/framework/zod"
import { MANUAL_ORDER_BUSINESS_STATUS_IDS } from "../../../utils/order-business-status"

export const GetAdminOrderBusinessStatusesSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()

export const GetAdminOrderBusinessStatusesByIdsSchema = z
  .object({
    ids: z.preprocess(
      (value) => {
        if (Array.isArray(value)) {
          return value.flatMap((item) =>
            typeof item === "string" ? item.split(",") : item
          )
        }

        return typeof value === "string" ? value.split(",") : value
      },
      z.array(z.string().min(1)).min(1).max(100)
    ),
  })
  .strict()

export const PostAdminOrderBusinessStatusesBulkSchema = z
  .object({
    order_ids: z.array(z.string().min(1)).min(1).max(1000),
    status: z.enum(MANUAL_ORDER_BUSINESS_STATUS_IDS).nullable(),
  })
  .strict()

export type GetAdminOrderBusinessStatusesSchemaType = z.infer<
  typeof GetAdminOrderBusinessStatusesSchema
>

export type GetAdminOrderBusinessStatusesByIdsSchemaType = z.infer<
  typeof GetAdminOrderBusinessStatusesByIdsSchema
>

export type PostAdminOrderBusinessStatusesBulkSchemaType = z.infer<
  typeof PostAdminOrderBusinessStatusesBulkSchema
>
