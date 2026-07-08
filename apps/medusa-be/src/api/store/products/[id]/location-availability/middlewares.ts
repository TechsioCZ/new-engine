import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"

const multiValueParamSchema = z.union([z.string(), z.array(z.string())])

export const StoreProductLocationAvailabilityQuerySchema = z
  .object({
    sales_channel_id: multiValueParamSchema.optional(),
  })
  .strict()

export const storeProductLocationAvailabilityRoutesMiddlewares: MiddlewareRoute[] =
  [
    {
      methods: ["GET"],
      matcher: "/store/products/:id/location-availability",
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
