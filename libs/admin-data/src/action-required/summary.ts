import { AdminApiError } from "../shared/error-utils"
import type {
  ActionRequiredOrdersResponse,
  ActionRequiredSummary,
  PendingB2BCustomersResponse,
} from "./types"

type SummaryResult<TData> = PromiseSettledResult<TData>

function isAuthStatusError(error: unknown) {
  const status = getErrorStatus(error)

  return status === 401 || status === 403
}

function getErrorStatus(error: unknown) {
  if (error instanceof AdminApiError) {
    return error.status
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status
  }

  return null
}

function getRejectedReason<TData>(result: SummaryResult<TData>) {
  return result.status === "rejected" ? result.reason : null
}

function getFulfilledValue<TData>(result: SummaryResult<TData>) {
  return result.status === "fulfilled" ? result.value : null
}

export function toActionRequiredSummary(
  ordersResult: SummaryResult<ActionRequiredOrdersResponse>,
  customersResult: SummaryResult<PendingB2BCustomersResponse>
): ActionRequiredSummary {
  const ordersError = getRejectedReason(ordersResult)
  const customersError = getRejectedReason(customersResult)

  if (isAuthStatusError(ordersError)) {
    throw ordersError
  }

  if (isAuthStatusError(customersError)) {
    throw customersError
  }

  if (
    ordersResult.status === "rejected" &&
    customersResult.status === "rejected"
  ) {
    throw ordersError ?? customersError ?? new Error("Action summary failed")
  }

  return {
    customers: getFulfilledValue(customersResult),
    orders: getFulfilledValue(ordersResult),
  }
}
