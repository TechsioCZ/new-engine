import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { ApprovalType } from "../../../types/approval/module"
import type { StoreGetApprovalsType } from "./validators"

interface CartWithApprovals {
  approvals?: object[]
  id: string
}

interface ApprovalStatusFilters {
  cart_id: string[]
  status?: StoreGetApprovalsType["status"]
}

const getDataRecords = (response: unknown): object[] => {
  if (!isRecord(response)) {
    return []
  }
  const data = getRecordValue(response, "data")
  return Array.isArray(data) ? data.filter(isRecord) : []
}

const getNestedRecord = (record: object, key: string): object | undefined => {
  const value = getRecordValue(record, key)
  return isRecord(value) ? value : undefined
}

const toCart = (value: unknown): CartWithApprovals | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  const id = getRecordValue(value, "id")
  if (typeof id !== "string") {
    return undefined
  }
  const approvals = getRecordValue(value, "approvals")
  return {
    ...value,
    ...(Array.isArray(approvals)
      ? {
          approvals: approvals.flatMap((approval) =>
            isRecord(approval) &&
            typeof getRecordValue(approval, "id") === "string"
              ? [{ id: getRecordValue(approval, "id") }]
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
  const customerIdValue = isRecord(authMetadata)
    ? getRecordValue(authMetadata, "customer_id")
    : undefined
  const customerId =
    typeof customerIdValue === "string" ? customerIdValue : undefined

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
  const companyId =
    company === undefined ? undefined : getRecordValue(company, "id")

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
  const companyCarts =
    companyRecord === undefined
      ? undefined
      : getRecordValue(companyRecord, "carts")
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
    const approvals =
      cart === undefined ? undefined : getRecordValue(cart, "approvals")
    return Array.isArray(approvals)
      ? approvals.flatMap((approval) => {
          const approvalId = isRecord(approval)
            ? getRecordValue(approval, "id")
            : undefined
          return typeof approvalId === "string" ? [approvalId] : []
        })
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
      (approval) => getRecordValue(approval, "cart_id") === cart.id,
    )
    if (cartApprovals.length === 0) {
      return []
    }
    return [{ ...cart, approvals: cartApprovals }]
  })

  if (cartsWithAdminApprovals.length === 0) {
    return res.json({ carts_with_approvals: [], count: 0 })
  }

  const rawMetadata: unknown = isRecord(approvalStatusResponse)
    ? getRecordValue(approvalStatusResponse, "metadata")
    : undefined
  const metadata = isRecord(rawMetadata) ? rawMetadata : {}
  return res.json({
    carts_with_approvals: cartsWithAdminApprovals,
    ...metadata,
  })
}

export { get as GET }
