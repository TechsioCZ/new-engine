import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"
import { normalizeDataForContext } from "@medusajs/medusa/api/utils/middlewares/products/normalize-data-for-context"
import { setPricingContext } from "@medusajs/medusa/api/utils/middlewares/products/set-pricing-context"
import { StoreVolumeDiscountsQuerySchema } from "./validators"

const VOLUME_DISCOUNT_QUERY_FIELDS = [
  "variants.calculated_price.calculated_amount",
]

export const storeVolumeDiscountsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/volume-discounts",

    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreVolumeDiscountsQuerySchema, {
        defaults: VOLUME_DISCOUNT_QUERY_FIELDS,
        allowed: VOLUME_DISCOUNT_QUERY_FIELDS,
        isList: false,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({ status: ProductStatus.PUBLISHED }),
      normalizeDataForContext(),
      setPricingContext(),
    ],
  },
]
