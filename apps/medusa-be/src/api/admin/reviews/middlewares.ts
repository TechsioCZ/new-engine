import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminGetReviewsSchema,
  AdminUpdateReviewSchema,
  AdminUpdateReviewStatusSchema,
} from "./validators"

export const adminReviewRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/reviews",
    middlewares: [
      validateAndTransformQuery(AdminGetReviewsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["PATCH"],
    matcher: "/admin/reviews/:id",
    middlewares: [validateAndTransformBody(AdminUpdateReviewSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/reviews/status",
    middlewares: [validateAndTransformBody(AdminUpdateReviewStatusSchema)],
  },
]
