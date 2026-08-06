import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import { ModuleCompanySpendingLimitResetFrequency } from "../../types/company/module"
import { checkSpendingLimit } from "../../utils/check-spending-limit"
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

interface ValidatedCart {
  approvals: ({ status?: string | null } | null)[]
  total: number
  customer_id?: string
}

interface ValidatedCustomer {
  employee: {
    company: {
      spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency
    }
    spending_limit: number
  } | null
  orders: ({ created_at: Date | string; total: number } | null)[]
}

const normalizeSpendingLimitResetFrequency = (
  value: unknown,
): ModuleCompanySpendingLimitResetFrequency => {
  switch (value) {
    case ModuleCompanySpendingLimitResetFrequency.DAILY:
    case ModuleCompanySpendingLimitResetFrequency.MONTHLY:
    case ModuleCompanySpendingLimitResetFrequency.NEVER:
    case ModuleCompanySpendingLimitResetFrequency.WEEKLY:
    case ModuleCompanySpendingLimitResetFrequency.YEARLY: {
      return value
    }
    default: {
      return ModuleCompanySpendingLimitResetFrequency.NEVER
    }
  }
}

const normalizeCart = (value: unknown): ValidatedCart | undefined => {
  if (!isRecord(value) || typeof value["total"] !== "number") {
    return undefined
  }

  const approvals: ({ status?: string | null } | null)[] = []
  if (Array.isArray(value["approvals"])) {
    for (const approval of value["approvals"]) {
      if (approval === null) {
        approvals.push(null)
      } else if (isRecord(approval)) {
        const { status } = approval
        if (
          status === undefined ||
          status === null ||
          typeof status === "string"
        ) {
          approvals.push(status === undefined ? {} : { status })
        }
      }
    }
  }

  const { customer_id: customerId } = value
  return {
    approvals,
    ...(typeof customerId === "string" && customerId !== ""
      ? { customer_id: customerId }
      : {}),
    total: value["total"],
  }
}

const normalizeCustomer = (value: unknown): ValidatedCustomer | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const employeeValue = value["employee"]
  let employee: ValidatedCustomer["employee"] = null
  if (isRecord(employeeValue)) {
    const spendingLimit = employeeValue["spending_limit"]
    const companyValue = employeeValue["company"]
    const resetFrequency = isRecord(companyValue)
      ? companyValue["spending_limit_reset_frequency"]
      : undefined

    if (typeof spendingLimit === "number") {
      employee = {
        company: {
          spending_limit_reset_frequency:
            normalizeSpendingLimitResetFrequency(resetFrequency),
        },
        spending_limit: spendingLimit,
      }
    }
  }

  const orders: ValidatedCustomer["orders"] = []
  if (Array.isArray(value["orders"])) {
    for (const order of value["orders"]) {
      if (order === null) {
        orders.push(null)
      } else if (
        isRecord(order) &&
        (order["created_at"] instanceof Date ||
          typeof order["created_at"] === "string") &&
        typeof order["total"] === "number"
      ) {
        orders.push({ created_at: order["created_at"], total: order["total"] })
      }
    }
  }

  return { employee, orders }
}

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const cartValue: unknown = cart
  if (!isRecord(cartValue) || typeof cartValue["id"] !== "string") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart id is required")
  }
  const cartId = cartValue["id"]
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const cartGraphResult: unknown = await query.graph({
    entity: "cart",
    fields: ["approvals.*", "customer_id", "total"],
    filters: {
      id: cartId,
    },
  })
  const queryCart =
    isRecord(cartGraphResult) && Array.isArray(cartGraphResult["data"])
      ? normalizeCart(cartGraphResult["data"][0])
      : undefined

  if (queryCart === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart "${cartId}" was not found`,
    )
  }

  const { isPendingApproval } = getCartApprovalStatus(queryCart)
  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval",
    )
  }

  if (queryCart.customer_id !== undefined) {
    const customerGraphResult: unknown = await query.graph({
      entity: "customer",
      fields: ["employee.spending_limit"],
      filters: {
        id: queryCart.customer_id,
      },
    })
    const customer =
      isRecord(customerGraphResult) &&
      Array.isArray(customerGraphResult["data"])
        ? normalizeCustomer(customerGraphResult["data"][0])
        : undefined

    if (customer === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer "${queryCart.customer_id}" was not found`,
      )
    }

    if (
      customer.employee !== null &&
      customer.employee.spending_limit !== 0 &&
      checkSpendingLimit(queryCart, customer)
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cart total exceeds spending limit",
      )
    }
  }

  return new StepResponse(undefined, null)
})
