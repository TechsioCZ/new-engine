import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { hasArrayData } from "../../../utils/guards"
import { isInactiveCustomerFirstName } from "../../../workflows/customer/normalizers"

type CustomerRecord = {
  deleted_at?: Date | string | null
  first_name?: string | null
  has_account?: boolean | null
  id: string
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function hasInactiveCustomerWithEmail({
  email,
  query,
}: {
  email: string
  query: Query
}) {
  const customerResult: unknown = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "has_account", "deleted_at"],
    filters: { email },
    withDeleted: true,
  })

  if (!hasArrayData<CustomerRecord>(customerResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while loading customer account."
    )
  }

  return customerResult.data.some(
    (customer) =>
      customer.deleted_at ||
      customer.has_account === false ||
      isInactiveCustomerFirstName(customer.first_name)
  )
}

export async function refetchCustomer(
  customerId: string,
  scope: AuthenticatedMedusaRequest["scope"],
  fields: string[]
) {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: { id: customerId },
    },
    fields,
  })
  const customers = await remoteQuery(queryObject)

  return customers[0]
}
