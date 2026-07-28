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
    methods: ["GET"],
    matcher: "/store/customers/me/reviews",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformQuery(StoreGetCustomerReviewsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["PATCH"],
    matcher: "/store/customers/me/reviews/:id",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(StoreUpdateCustomerReviewSchema),
    ],
  },
]
