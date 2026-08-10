import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { UpsertCustomersBatchSchema } from "./validators"

export const symmyCustomersBatchRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/customers/batch",
    methods: ["POST"],
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpsertCustomersBatchSchema),
    ],
  },
]
