import { validateAndTransformQuery } from "@medusajs/framework"
import { applyDefaultFilters } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"

const multiValueParamSchema = z.union([z.string(), z.array(z.string())])

export const StoreProductAttributesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    sales_channel_id: multiValueParamSchema.optional(),
  })
  .strict()

export type StoreProductAttributesQuery = z.infer<
  typeof StoreProductAttributesQuerySchema
>

export const storeProductAttributesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/products/:id/product-attributes",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreProductAttributesQuerySchema, {
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({
        status: ProductStatus.PUBLISHED,
      }),
    ],
  },
]
