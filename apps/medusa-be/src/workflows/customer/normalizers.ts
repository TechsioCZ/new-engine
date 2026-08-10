export const INACTIVE_CUSTOMER_NAME_PREFIX = "[INACTIVE]"

export interface CustomerNameInput {
  first_name?: string | null
  last_name?: string | null
}

export const normalizeCustomerName = (
  customer: CustomerNameInput,
): string | undefined => {
  const fullName = [customer.first_name, customer.last_name]
    .map((value) => value?.trim())
    .filter((value): value is string => value !== undefined && value !== "")
    .join(" ")

  return fullName === "" ? undefined : fullName
}

export const normalizeInactiveCustomerFirstName = (
  firstName?: string | null,
): string => {
  const normalizedFirstName = firstName?.trim()

  if (normalizedFirstName === undefined || normalizedFirstName === "") {
    return INACTIVE_CUSTOMER_NAME_PREFIX
  }

  if (normalizedFirstName.startsWith(INACTIVE_CUSTOMER_NAME_PREFIX)) {
    return normalizedFirstName
  }

  return `${INACTIVE_CUSTOMER_NAME_PREFIX} ${normalizedFirstName}`
}

export const normalizeReactivatedCustomerFirstName = (
  firstName?: string | null,
): string | null => {
  const normalizedFirstName = firstName?.trim()

  if (normalizedFirstName === undefined || normalizedFirstName === "") {
    return null
  }

  if (!normalizedFirstName.startsWith(INACTIVE_CUSTOMER_NAME_PREFIX)) {
    return normalizedFirstName
  }

  const reactivatedFirstName = normalizedFirstName
    .slice(INACTIVE_CUSTOMER_NAME_PREFIX.length)
    .trim()

  return reactivatedFirstName === "" ? null : reactivatedFirstName
}
