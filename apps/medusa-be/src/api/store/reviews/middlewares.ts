import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import { StoreGetProductReviewsSchema } from "../products/[id]/reviews/validators"
import { StoreCreateReviewSchema } from "./validators"

export const storeReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/reviews",
    methods: ["POST"],
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformBody(StoreCreateReviewSchema),
    ],
  },
  {
    matcher: "/store/products/:id/reviews",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreGetProductReviewsSchema, {
        isList: true,
      }),
    ],
  },
]
