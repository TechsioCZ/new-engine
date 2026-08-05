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
    matcher: "/admin/reviews",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetReviewsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/reviews/:id",
    methods: ["PATCH"],
    middlewares: [validateAndTransformBody(AdminUpdateReviewSchema)],
  },
  {
    matcher: "/admin/reviews/status",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateReviewStatusSchema)],
  },
]
