import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { hasArrayData } from "../../../utils/guards"
import { isCustomerRecord } from "../../../workflows/customer/steps/prepare-customer-account-reactivation"

export const assertInactiveCustomerReactivationIdentity = ({
  actorId,
  customerId,
}: {
  actorId?: string | null
  customerId: string
}): void => {
  if (actorId !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Reactivating this customer account requires its existing credentials.",
    )
  }
}

export const findInactiveCustomerWithEmail = async ({
  email,
  query,
}: {
  email: string
  query: Query
}) => {
  const customerResult: unknown = await query.graph({
    entity: "customer",
    fields: [
      "id",
      "email",
      "company_name",
      "first_name",
      "last_name",
      "phone",
      "metadata",
      "has_account",
      "deleted_at",
    ],
    filters: { email },
    withDeleted: true,
  })

  if (!hasArrayData(customerResult, isCustomerRecord)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while loading customer account.",
    )
  }

  return (
    customerResult.data.find(
      (customer) =>
        customer.deleted_at instanceof Date ||
        (typeof customer.deleted_at === "string" &&
          customer.deleted_at.length > 0) ||
        customer.has_account === false,
    ) ?? null
  )
}

export const refetchCustomer = async (
  customerId: string,
  query: Query,
  fields: string[],
) => {
  const customerResult: unknown = await query.graph({
    entity: "customer",
    fields,
    filters: { id: customerId },
  })

  if (!hasArrayData(customerResult, isCustomerRecord)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while refetching customer account.",
    )
  }

  return customerResult.data[0]
}
