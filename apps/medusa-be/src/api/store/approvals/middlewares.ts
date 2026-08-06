import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MiddlewareRoute } from "@medusajs/medusa"
import { isRecord } from "@techsio/std/object"

import { ApprovalType } from "../../../types/approval/module"
import { ensureRole } from "../../middlewares/ensure-role"
import { approvalTransformQueryConfig } from "./query-config"
import { StoreGetApprovals, StoreUpdateApproval } from "./validators"

const getFirstDataRecord = (
  response: unknown,
): Record<string, unknown> | null => {
  if (!isRecord(response)) {
    return null
  }
  const { data } = response
  if (!Array.isArray(data)) {
    return null
  }
  const first: unknown = data.at(0)
  return isRecord(first) ? first : null
}

const getNestedRecord = (record: Record<string, unknown>, key: string) => {
  const { [key]: value } = record
  return isRecord(value) ? value : undefined
}

const ensureApprovalType = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  const { id } = req.params
  const metadata: unknown = req.auth_context.app_metadata
  const { customer_id: rawCustomerId } = isRecord(metadata) ? metadata : {}
  const customerId =
    typeof rawCustomerId === "string" ? rawCustomerId : undefined

  if (id === undefined || id === "") {
    res.status(400).json({ message: "Approval id is required" })
    return
  }

  if (customerId === undefined || customerId === "") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const approvalResponse: unknown = await query.graph({
    entity: "approval",
    fields: ["type", "cart.company.id"],
    filters: { id },
  })
  const approval = getFirstDataRecord(approvalResponse)

  if (approval === null) {
    res.status(404).json({ message: "Approval not found" })
    return
  }

  if (approval["type"] !== ApprovalType.ADMIN) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const customerResponse: unknown = await query.graph({
    entity: "customer",
    fields: ["employee.company.id", "employee.is_admin"],
    filters: { id: customerId },
  })
  const customer = getFirstDataRecord(customerResponse)
  const employee = customer && getNestedRecord(customer, "employee")
  const customerCompany = employee && getNestedRecord(employee, "company")
  const cart = getNestedRecord(approval, "cart")
  const approvalCompany = cart && getNestedRecord(cart, "company")

  if (
    employee?.["is_admin"] !== true ||
    typeof customerCompany?.["id"] !== "string" ||
    customerCompany["id"] !== approvalCompany?.["id"]
  ) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  next()
}

export const storeApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/approvals*",
    methods: ["GET", "POST"],
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    matcher: "/store/approvals",
    methods: ["GET"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformQuery(
        StoreGetApprovals,
        approvalTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/approvals/:id",
    methods: ["POST"],
    middlewares: [
      ensureApprovalType,
      validateAndTransformBody(StoreUpdateApproval),
    ],
  },
]
