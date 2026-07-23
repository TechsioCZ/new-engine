import { authenticate, validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreGetCustomerReviewsSchema } from "./validators"

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
]
