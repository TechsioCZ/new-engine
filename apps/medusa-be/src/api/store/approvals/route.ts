import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { ApprovalType } from "../../../types/approval/module"
import type { StoreGetApprovalsType } from "./validators"

interface CartWithApprovals extends Record<string, unknown> {
  approvals?: Record<string, unknown>[]
  id: string
}

interface ApprovalStatusFilters {
  cart_id: string[]
  status?: StoreGetApprovalsType["status"]
}

const getDataRecords = (response: unknown): Record<string, unknown>[] => {
  if (!isRecord(response)) {
    return []
  }
  const { data } = response
  return Array.isArray(data) ? data.filter(isRecord) : []
}

const getNestedRecord = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined => {
  const { [key]: value } = record
  return isRecord(value) ? value : undefined
}

const toCart = (value: unknown): CartWithApprovals | undefined => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return undefined
  }
  const { approvals, id } = value
  return {
    ...value,
    ...(Array.isArray(approvals)
      ? {
          approvals: approvals.flatMap((approval) =>
            isRecord(approval) && typeof approval["id"] === "string"
              ? [{ id: approval["id"] }]
              : [],
          ),
        }
      : {}),
    id,
  }
}

const get = async (
  req: AuthenticatedMedusaRequest<StoreGetApprovalsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const authMetadata: unknown = req.auth_context.app_metadata
  const customerId =
    isRecord(authMetadata) && typeof authMetadata["customer_id"] === "string"
      ? authMetadata["customer_id"]
      : undefined

  if (customerId === undefined || customerId === "") {
    return res.json({ carts_with_approvals: [], count: 0 })
  }

  const customerResponse: unknown = await query.graph({
    entity: "customer",
    fields: ["employee.company.id"],
    filters: { id: customerId },
  })
  const [customer] = getDataRecords(customerResponse)
  const employee = customer && getNestedRecord(customer, "employee")
  const company = employee && getNestedRecord(employee, "company")
  const companyId = company?.["id"]

  if (typeof companyId !== "string" || companyId === "") {
    return res.json({ carts_with_approvals: [], count: 0 })
  }

  const companyResponse: unknown = await query.graph({
    entity: "company",
    fields: [
      "carts.*",
      "carts.approval_status.*",
      "carts.company.approval_settings.*",
      "carts.company.*",
      "carts.items.*",
      "carts.completed_at",
    ],
    filters: { id: companyId },
  })
  const [companyRecord] = getDataRecords(companyResponse)
  const companyCarts = companyRecord?.["carts"]
  const carts = Array.isArray(companyCarts)
    ? companyCarts.flatMap((cart) => {
        const parsed = toCart(cart)
        return parsed === undefined ? [] : [parsed]
      })
    : []

  if (carts.length === 0) {
    return res.json({ carts_with_approvals: [], count: 0 })
  }

  const { status } = req.validatedQuery
  const approvalStatusFilters: ApprovalStatusFilters = {
    cart_id: carts.map((cart) => cart.id),
  }
  if (status !== undefined) {
    approvalStatusFilters.status = status
  }

  const approvalStatusResponse: unknown = await query.graph({
    entity: "approval_status",
    ...req.queryConfig,
    fields: ["*", "cart.approvals.id"],
    filters: approvalStatusFilters,
  })
  const approvalStatusRecords = getDataRecords(approvalStatusResponse)
  const approvalIds = approvalStatusRecords.flatMap((approvalStatus) => {
    const cart = getNestedRecord(approvalStatus, "cart")
    const approvals = cart?.["approvals"]
    return Array.isArray(approvals)
      ? approvals.flatMap((approval) =>
          isRecord(approval) && typeof approval["id"] === "string"
            ? [approval["id"]]
            : [],
        )
      : []
  })

  const approvalsResponse: unknown = await query.graph({
    entity: "approval",
    fields: ["*"],
    filters: {
      id: approvalIds,
      type: ApprovalType.ADMIN,
    },
  })
  const approvals = getDataRecords(approvalsResponse)
  const cartsWithAdminApprovals = carts.flatMap((cart) => {
    const cartApprovals = approvals.filter(
      (approval) => approval["cart_id"] === cart.id,
    )
    if (cartApprovals.length === 0) {
      return []
    }
    return [{ ...cart, approvals: cartApprovals }]
  })

  if (cartsWithAdminApprovals.length === 0) {
    return res.json({ carts_with_approvals: [], count: 0 })
  }

  const metadata =
    isRecord(approvalStatusResponse) &&
    isRecord(approvalStatusResponse["metadata"])
      ? approvalStatusResponse["metadata"]
      : {}
  return res.json({
    carts_with_approvals: cartsWithAdminApprovals,
    ...metadata,
  })
}

export { get as GET }
