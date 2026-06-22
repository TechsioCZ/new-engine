import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreGetHeurekaExternalReviewsSchema } from "./heureka/validators"

export const storeExternalReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/external-reviews/heureka",
    middlewares: [
      validateAndTransformQuery(StoreGetHeurekaExternalReviewsSchema, {
        isList: false,
      }),
    ],
  },
]
