import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { AdminApproval, AdminCartWithApprovals } from "../../../types"
import type { AdminGetApprovalsType } from "./validators"

type ApprovalStatusFilters = {
  status?: AdminGetApprovalsType["status"]
}

type GraphApprovalCart = Omit<AdminCartWithApprovals, "approval_requests"> & {
  approvals?: AdminApproval[]
  approval_requests?: AdminApproval[]
}

const normalizeApprovalCart = (
  cart: GraphApprovalCart
): AdminCartWithApprovals => {
  const { approvals, approval_requests, ...normalizedCart } = cart

  return {
    ...normalizedCart,
    approval_requests: approval_requests ?? approvals ?? [],
  }
}

const isApprovalCart = (
  cart: GraphApprovalCart | null
): cart is GraphApprovalCart => Boolean(cart)

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetApprovalsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { status } = req.validatedQuery || {}

  const filters: ApprovalStatusFilters = status ? { status } : {}

  const { data: approvalStatuses, metadata } = await query.graph({
    entity: "approval_status",
    ...req.queryConfig,
    fields: [
      "cart.*",
      "cart.approvals.*",
      "cart.approval_status.*",
      "cart.company.approval_settings.*",
      "cart.company.*",
      "cart.items.*",
      "cart.completed_at",
    ],
    filters,
  })

  const carts = approvalStatuses
    .map((approvalStatus) => approvalStatus.cart as GraphApprovalCart | null)
    .filter(isApprovalCart)
    .map(normalizeApprovalCart)

  res.json({
    carts_with_approvals: carts,
    ...metadata,
  })
}
