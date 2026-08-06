import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"

import { approvalTransformQueryConfig } from "./query-config"
import { AdminGetApprovals, AdminUpdateApproval } from "./validators"

export const adminApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/approvals*",
    methods: ["ALL"],
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    matcher: "/admin/approvals",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetApprovals,
        approvalTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/admin/approvals/:id",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateApproval)],
  },
]
