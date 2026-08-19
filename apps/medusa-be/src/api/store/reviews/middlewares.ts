import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"
import { verifyCloudflareTurnstile } from "../../middlewares/cloudflare-turnstile"
import { StoreGetProductReviewsSchema } from "../products/[id]/reviews/validators"
import {
  StoreCreateReviewQuerySchema,
  StoreCreateReviewSchema,
} from "./validators"

export const storeReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/store/reviews",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      verifyCloudflareTurnstile({ expectedAction: "product_review" }),
      validateAndTransformBody(StoreCreateReviewSchema),
      validateAndTransformQuery(StoreCreateReviewQuerySchema, { isList: true }),
      filterByValidSalesChannels(),
      applyDefaultFilters({ status: ProductStatus.PUBLISHED }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/products/:id/reviews",
    middlewares: [
      validateAndTransformQuery(StoreGetProductReviewsSchema, {
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({ status: ProductStatus.PUBLISHED }),
    ],
  },
]
