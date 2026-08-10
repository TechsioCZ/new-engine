import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import { StoreHeurekaShopReviewsSchema } from "./validators"

export const storeShopReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/shop-reviews/heureka",
    methods: ["GET"],
    middlewares: [validateAndTransformQuery(StoreHeurekaShopReviewsSchema, {})],
  },
]
