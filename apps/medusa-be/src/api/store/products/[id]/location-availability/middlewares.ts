import { validateAndTransformQuery } from "@medusajs/framework"
import { applyDefaultFilters, authenticate } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"

const multiValueParamSchema = z.union([z.string(), z.array(z.string())])

export const StoreProductLocationAvailabilityQuerySchema = z
  .object({
    sales_channel_id: multiValueParamSchema.optional(),
  })
  .strict()

export type StoreProductLocationAvailabilityQuery = z.infer<
  typeof StoreProductLocationAvailabilityQuerySchema
>

export const storeProductLocationAvailabilityRoutesMiddlewares: MiddlewareRoute[] =
  [
    {
      matcher: "/store/products/:id/location-availability",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        validateAndTransformQuery(StoreProductLocationAvailabilityQuerySchema, {
          isList: false,
        }),
        filterByValidSalesChannels(),
        applyDefaultFilters({
          status: ProductStatus.PUBLISHED,
        }),
      ],
    },
  ]
