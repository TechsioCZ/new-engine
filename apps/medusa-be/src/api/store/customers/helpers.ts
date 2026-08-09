import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { hasArrayData } from "../../../utils/guards"
import type { CustomerRecord } from "../../../workflows/customer/steps/prepare-customer-account-reactivation"

export async function findInactiveCustomerWithEmail({
  email,
  query,
}: {
  email: string
  query: Query
}) {
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

  if (!hasArrayData<CustomerRecord>(customerResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while loading customer account."
    )
  }

  return (
    customerResult.data.find(
      (customer) => customer.deleted_at || customer.has_account === false
    ) ?? null
  )
}

export async function refetchCustomer(
  customerId: string,
  query: Query,
  fields: string[]
) {
  const customerResult: unknown = await query.graph({
    entity: "customer",
    fields,
    filters: { id: customerId },
  })

  if (!hasArrayData<CustomerRecord>(customerResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while refetching customer account."
    )
  }

  return customerResult.data[0]
}
