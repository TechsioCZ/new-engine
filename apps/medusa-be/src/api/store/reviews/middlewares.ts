import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"
import { StoreGetProductReviewsSchema } from "../products/[id]/reviews/validators"
import { StoreCreateReviewSchema } from "./validators"

export const storeReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/store/reviews",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreCreateReviewSchema),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/products/:id/reviews",
    middlewares: [
      validateAndTransformQuery(StoreGetProductReviewsSchema, {
        isList: true,
      }),
    ],
  },
]
