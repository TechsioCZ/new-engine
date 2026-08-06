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
