import {
  type AuthenticatedMedusaRequest,
  authenticate,
  type MedusaNextFunction,
  type MedusaResponse,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"
import { ApprovalType } from "../../../types"
import { ensureRole } from "../../middlewares/ensure-role"
import { approvalTransformQueryConfig } from "./query-config"
import { StoreGetApprovals, StoreUpdateApproval } from "./validators"

const ensureApprovalType = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const { id } = req.params
  const { customer_id: customerId } = req.auth_context.app_metadata as {
    customer_id?: string
  }

  if (!customerId) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const query = req.scope.resolve("query")

  const {
    data: [approval],
  } = await query.graph({
    entity: "approval",
    fields: ["type", "cart.company.id"],
    filters: { id },
  })

  if (!approval) {
    res.status(404).json({ message: "Approval not found" })
    return
  }

  const approvalType = approval.type as unknown as ApprovalType

  if (approvalType !== ApprovalType.ADMIN) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["employee.company.id", "employee.is_admin"],
    filters: { id: customerId },
  })

  if (
    !customer?.employee?.is_admin ||
    customer.employee.company?.id !== approval.cart?.company?.id
  ) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  next()
}

export const storeApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/approvals*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/store/approvals",
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformQuery(
        StoreGetApprovals,
        approvalTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/approvals/:id",
    middlewares: [
      ensureApprovalType,
      validateAndTransformBody(StoreUpdateApproval),
    ],
  },
]
