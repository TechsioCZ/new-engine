import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { UpsertCustomerGroupsBatchSchema } from "./validators"

export const symmyCustomerGroupsBatchRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/customer-groups/batch",
    methods: ["POST"],
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpsertCustomerGroupsBatchSchema),
    ],
  },
]
