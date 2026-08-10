import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreHeurekaShopReviewsSchema } from "./validators"

export const storeShopReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/shop-reviews/heureka",
    middlewares: [validateAndTransformQuery(StoreHeurekaShopReviewsSchema, {})],
  },
]
