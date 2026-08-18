import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"
import { verifyCloudflareTurnstile } from "../../middlewares/cloudflare-turnstile"
import { StoreGetProductReviewsSchema } from "../products/[id]/reviews/validators"
import { StoreCreateReviewSchema } from "./validators"

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
