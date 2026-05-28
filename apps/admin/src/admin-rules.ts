import type { MedusaAdminCustomer, PendingB2BCustomer } from "./admin-types"

const B2B_CUSTOMER_TYPE_METADATA_KEY = "customer_type"
const B2B_APPROVAL_STATUS_METADATA_KEY = "b2b_approval_status"

export function isPendingB2BCustomer(customer: MedusaAdminCustomer) {
  return (
    customer.metadata?.[B2B_CUSTOMER_TYPE_METADATA_KEY] === "b2b" &&
    customer.metadata?.[B2B_APPROVAL_STATUS_METADATA_KEY] === "pending"
  )
}

export function toPendingB2BCustomer(
  customer: MedusaAdminCustomer
): PendingB2BCustomer {
  return {
    company_name: customer.company_name ?? null,
    created_at: customer.created_at ?? null,
    email: customer.email ?? null,
    first_name: customer.first_name ?? null,
    id: customer.id,
    last_name: customer.last_name ?? null,
    metadata: customer.metadata ?? {},
    phone: customer.phone ?? null,
  }
}
