import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import type { AdminGetApprovalsType } from "./validators"

interface ApprovalStatusFilters {
  status?: AdminGetApprovalsType["status"]
}

const normalizeApprovalCart = (
  cart: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    approvals,
    approval_requests: approvalRequests,
    ...normalizedCart
  } = cart

  let normalizedApprovals: unknown[] = []
  if (Array.isArray(approvalRequests)) {
    normalizedApprovals = approvalRequests
  } else if (Array.isArray(approvals)) {
    normalizedApprovals = approvals
  }

  return {
    ...normalizedCart,
    approval_requests: normalizedApprovals,
  }
}

const getRoute = async (
  req: AuthenticatedMedusaRequest<AdminGetApprovalsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { status } = req.validatedQuery
  const filters: ApprovalStatusFilters = status === undefined ? {} : { status }
  const graphResult: unknown = await query.graph({
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

  const carts: Record<string, unknown>[] = []
  if (isRecord(graphResult) && Array.isArray(graphResult["data"])) {
    for (const approvalStatus of graphResult["data"]) {
      if (!isRecord(approvalStatus)) {
        continue
      }

      const { cart } = approvalStatus
      if (isRecord(cart)) {
        carts.push(normalizeApprovalCart(cart))
      }
    }
  }

  const metadata =
    isRecord(graphResult) && isRecord(graphResult["metadata"])
      ? graphResult["metadata"]
      : {}

  res.json({
    carts_with_approvals: carts,
    ...metadata,
  })
}

export { getRoute as GET }
