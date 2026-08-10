import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import type { CustomerRecord } from "../../../workflows/customer/steps/prepare-customer-account-reactivation"

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
  const customerResult: { data: CustomerRecord[] } = await query.graph({
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
  const customerResult: { data: CustomerRecord[] } = await query.graph({
    entity: "customer",
    fields,
    filters: { id: customerId },
  })

  return customerResult.data[0]
}
