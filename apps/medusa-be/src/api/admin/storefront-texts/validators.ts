import { z } from "@medusajs/framework/zod"
import {
  STOREFRONT_TEXT_LOCALES,
  STOREFRONT_TEXT_MARKET_IDS,
  STOREFRONT_TEXT_NAMESPACES,
  STOREFRONT_TEXT_STATUSES,
} from "../../../modules/storefront-text/registry"

export const AdminGetStorefrontTextsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    locale: z.enum(STOREFRONT_TEXT_LOCALES).optional(),
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS).optional(),
    namespace: z.enum(STOREFRONT_TEXT_NAMESPACES).optional(),
    offset: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().trim().optional(),
    status: z.enum(STOREFRONT_TEXT_STATUSES).optional(),
  })
  .strict()

export const AdminUpdateStorefrontTextSchema = z
  .object({
    status: z.enum(STOREFRONT_TEXT_STATUSES).optional(),
    value: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })

export type AdminGetStorefrontTextsSchemaType = z.infer<
  typeof AdminGetStorefrontTextsSchema
>
export type AdminUpdateStorefrontTextSchemaType = z.infer<
  typeof AdminUpdateStorefrontTextSchema
>
