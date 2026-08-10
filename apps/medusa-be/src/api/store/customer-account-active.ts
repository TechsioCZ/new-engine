import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import type { CustomerRecord } from "../../workflows/customer/steps/prepare-customer-account-reactivation"

interface OptionallyAuthenticatedMedusaRequest extends MedusaRequest {
  auth_context?: AuthenticatedMedusaRequest["auth_context"]
}

const isReactivationRegistration = (
  req: OptionallyAuthenticatedMedusaRequest,
): boolean =>
  req.method === "POST" &&
  (req.path === "/store/customers" || req.path === "/customers")

export const assertCustomerAccountIsActive = (
  customer: CustomerRecord | undefined,
): void => {
  const isSoftDeleted =
    customer?.deleted_at instanceof Date ||
    (typeof customer?.deleted_at === "string" && customer.deleted_at.length > 0)

  if (
    customer === undefined ||
    customer.has_account === false ||
    isSoftDeleted
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Customer account is inactive.",
    )
  }
}

export const ensureAuthenticatedCustomerIsActive = async (
  req: OptionallyAuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> => {
  const customerId = req.auth_context?.actor_id

  if (
    customerId === undefined ||
    customerId === null ||
    customerId === "" ||
    isReactivationRegistration(req)
  ) {
    next()
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customerResult: { data: CustomerRecord[] } = await query.graph({
    entity: "customer",
    fields: ["id", "has_account", "deleted_at"],
    filters: { id: customerId },
    withDeleted: true,
  })

  assertCustomerAccountIsActive(customerResult.data[0])

  next()
}
