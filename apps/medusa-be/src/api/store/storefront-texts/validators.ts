import { z } from "@medusajs/framework/zod"
import {
  STOREFRONT_TEXT_MARKET_IDS,
  STOREFRONT_TEXT_NAMESPACES,
} from "../../../modules/storefront-text/registry"

export const StoreGetStorefrontTextsSchema = z
  .object({
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS),
    namespace: z.enum(STOREFRONT_TEXT_NAMESPACES).optional(),
  })
  .strict()

export type StoreGetStorefrontTextsSchemaType = z.infer<
  typeof StoreGetStorefrontTextsSchema
>
