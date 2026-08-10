import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { AddTrackingBatchSchema } from "./validators"

export const symmyTrackingBatchRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/tracking/batch",
    methods: ["POST"],
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(AddTrackingBatchSchema),
    ],
  },
]
