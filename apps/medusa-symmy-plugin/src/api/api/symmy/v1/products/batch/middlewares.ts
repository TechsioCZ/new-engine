import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { UpsertProductsBatchSchema } from "./validators"

export const symmyProductsBatchRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/products/batch",
    methods: ["POST"],
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpsertProductsBatchSchema),
    ],
  },
]
