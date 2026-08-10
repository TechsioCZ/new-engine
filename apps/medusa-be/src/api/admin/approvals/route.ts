import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import type { AdminGetApprovalsType } from "./validators"

interface ApprovalStatusFilters {
  status?: AdminGetApprovalsType["status"]
}

const normalizeApprovalCart = (cart: object): object => {
  const approvals = getRecordValue(cart, "approvals")
  const approvalRequests = getRecordValue(cart, "approval_requests")
  const normalizedCart = { ...cart }
  Reflect.deleteProperty(normalizedCart, "approvals")
  Reflect.deleteProperty(normalizedCart, "approval_requests")

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

  const carts: object[] = []
  const data: unknown = isRecord(graphResult)
    ? getRecordValue(graphResult, "data")
    : undefined
  if (Array.isArray(data)) {
    for (const approvalStatus of data) {
      if (!isRecord(approvalStatus)) {
        continue
      }

      const cart = getRecordValue(approvalStatus, "cart")
      if (isRecord(cart)) {
        carts.push(normalizeApprovalCart(cart))
      }
    }
  }

  const rawMetadata: unknown = isRecord(graphResult)
    ? getRecordValue(graphResult, "metadata")
    : undefined
  const metadata = isRecord(rawMetadata) ? rawMetadata : {}

  res.json({
    carts_with_approvals: carts,
    ...metadata,
  })
}

export { getRoute as GET }
