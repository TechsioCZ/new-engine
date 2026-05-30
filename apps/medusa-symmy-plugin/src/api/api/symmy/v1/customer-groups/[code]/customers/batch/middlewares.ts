import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { AssignCustomersToGroupBatchSchema } from "./validators"

export const symmyCustomerGroupCustomersBatchRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/customer-groups/:code/customers/batch",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(AssignCustomersToGroupBatchSchema),
    ],
  },
]
