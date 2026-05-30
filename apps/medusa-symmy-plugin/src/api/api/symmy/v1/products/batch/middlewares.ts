import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { UpsertProductsBatchSchema } from "./validators"

export const symmyProductsBatchRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/products/batch",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpsertProductsBatchSchema),
    ],
  },
]
