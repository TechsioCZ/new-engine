import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  StoreGetCustomerReviewsSchema,
  StoreUpdateCustomerReviewSchema,
} from "./validators"

export const storeCustomerReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/customers/me/reviews",
    methods: ["GET"],
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformQuery(StoreGetCustomerReviewsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/store/customers/me/reviews/:id",
    methods: ["PATCH"],
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreUpdateCustomerReviewSchema),
    ],
  },
]
