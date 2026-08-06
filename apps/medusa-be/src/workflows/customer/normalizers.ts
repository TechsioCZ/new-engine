export const INACTIVE_CUSTOMER_NAME_PREFIX = "[INACTIVE]"

export type CustomerNameInput = {
  first_name?: string | null
  last_name?: string | null
}

export function normalizeCustomerName(customer: CustomerNameInput) {
  const fullName = [customer.first_name, customer.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")

  return fullName || undefined
}

export function normalizeInactiveCustomerFirstName(firstName?: string | null) {
  const normalizedFirstName = firstName?.trim()

  if (!normalizedFirstName) {
    return INACTIVE_CUSTOMER_NAME_PREFIX
  }

  if (normalizedFirstName.startsWith(INACTIVE_CUSTOMER_NAME_PREFIX)) {
    return normalizedFirstName
  }

  return `${INACTIVE_CUSTOMER_NAME_PREFIX} ${normalizedFirstName}`
}
