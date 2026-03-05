export type CheckoutAddressInput = {
  firstName?: string | null
  lastName?: string | null
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  province?: string | null
  company?: string | null
  phone?: string | null
}

export type CheckoutAddressData<
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
> = {
  shipping: TAddress
  billing: TAddress
  useSameAddress?: boolean
  email?: string | null
}

export type CheckoutAddressValidationOptions = {
  requireEmail?: boolean
  shippingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
  billingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
}

export type CheckoutAddressValidationIssue = {
  scope: "shipping" | "billing" | "root"
  field: string
  message: string
}

export type MedusaCartAddressPayload = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  country_code?: string
  province?: string
  company?: string
  phone?: string
}

export type BuildCheckoutCartAddressInputOptions = {
  defaultCountryCode?: string
  countryCodeTransform?: (countryCode: string) => string
}

export type CheckoutCartAddressInput = {
  email?: string
  shippingAddress: MedusaCartAddressPayload
  billingAddress: MedusaCartAddressPayload
  useSameAddress: boolean
}

export type CartShippingAddressLike = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
}

const defaultRequiredFields: readonly (keyof CheckoutAddressInput)[] = [
  "firstName",
  "lastName",
  "street",
  "city",
  "postalCode",
  "country",
]

const hasValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (!hasValue(value)) {
    return
  }
  return value.trim()
}

const normalizeCountryCode = (
  countryCode: string | null | undefined,
  options?: BuildCheckoutCartAddressInputOptions
): string | undefined => {
  const transformed =
    countryCode && options?.countryCodeTransform
      ? options.countryCodeTransform(countryCode)
      : countryCode

  if (transformed) {
    return transformed.toLowerCase()
  }

  if (options?.defaultCountryCode) {
    return options.defaultCountryCode.toLowerCase()
  }

  return
}

export const normalizeCheckoutAddressInput = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress
): TAddress => {
  const normalized = {
    ...address,
    firstName: normalizeOptionalString(address.firstName),
    lastName: normalizeOptionalString(address.lastName),
    street: normalizeOptionalString(address.street),
    city: normalizeOptionalString(address.city),
    postalCode: normalizeOptionalString(address.postalCode),
    country: normalizeOptionalString(address.country),
    province: normalizeOptionalString(address.province),
    company: normalizeOptionalString(address.company),
    phone: normalizeOptionalString(address.phone),
  }

  return normalized as TAddress
}

export const getMissingCheckoutAddressFields = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  requiredFields: readonly (keyof CheckoutAddressInput)[] = defaultRequiredFields
): (keyof CheckoutAddressInput)[] =>
  requiredFields.filter((field) => !hasValue(address[field]))

export const hasCheckoutAddressCoreFields = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  requiredFields: readonly (keyof CheckoutAddressInput)[] = defaultRequiredFields
): boolean => getMissingCheckoutAddressFields(address, requiredFields).length === 0

export const getCheckoutAddressValidationIssues = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: CheckoutAddressValidationOptions
): CheckoutAddressValidationIssue[] => {
  const issues: CheckoutAddressValidationIssue[] = []
  const requireEmail = options?.requireEmail ?? true
  const useSameAddress = data.useSameAddress ?? true
  const shippingRequiredFields =
    options?.shippingRequiredFields ?? defaultRequiredFields
  const billingRequiredFields =
    options?.billingRequiredFields ?? defaultRequiredFields

  const normalizedShipping = normalizeCheckoutAddressInput(data.shipping)
  const normalizedBilling = normalizeCheckoutAddressInput(data.billing)

  for (const field of getMissingCheckoutAddressFields(
    normalizedShipping,
    shippingRequiredFields
  )) {
    issues.push({
      scope: "shipping",
      field: String(field),
      message: `Missing shipping field: ${String(field)}`,
    })
  }

  if (!useSameAddress) {
    for (const field of getMissingCheckoutAddressFields(
      normalizedBilling,
      billingRequiredFields
    )) {
      issues.push({
        scope: "billing",
        field: String(field),
        message: `Missing billing field: ${String(field)}`,
      })
    }
  }

  const normalizedEmail = normalizeOptionalString(data.email)
  if (requireEmail && !normalizedEmail) {
    issues.push({
      scope: "root",
      field: "email",
      message: "Missing checkout email",
    })
  }

  return issues
}

export const hasCheckoutAddressData = <TAddress extends CheckoutAddressInput>(
  data: CheckoutAddressData<TAddress> | null | undefined,
  options?: CheckoutAddressValidationOptions
): boolean => {
  if (!data) {
    return false
  }

  return getCheckoutAddressValidationIssues(data, options).length === 0
}

export const mapCheckoutAddressToMedusaCartAddress = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: BuildCheckoutCartAddressInputOptions
): MedusaCartAddressPayload => {
  const firstName = normalizeOptionalString(address.firstName)
  const lastName = normalizeOptionalString(address.lastName)
  const street = normalizeOptionalString(address.street)
  const city = normalizeOptionalString(address.city)
  const postalCode = normalizeOptionalString(address.postalCode)
  const province = normalizeOptionalString(address.province)
  const company = normalizeOptionalString(address.company)
  const phone = normalizeOptionalString(address.phone)
  const countryCode = normalizeCountryCode(address.country, options)

  return {
    first_name: firstName,
    last_name: lastName,
    address_1: street,
    city,
    postal_code: postalCode,
    country_code: countryCode,
    province,
    company,
    phone,
  }
}

export const buildCheckoutCartAddressInput = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: BuildCheckoutCartAddressInputOptions
): CheckoutCartAddressInput => {
  const useSameAddress = data.useSameAddress ?? true
  const shippingAddress = mapCheckoutAddressToMedusaCartAddress(
    data.shipping,
    options
  )
  const billingAddress = useSameAddress
    ? shippingAddress
    : mapCheckoutAddressToMedusaCartAddress(data.billing, options)

  const normalizedEmail = normalizeOptionalString(data.email)

  return {
    email: normalizedEmail,
    shippingAddress,
    billingAddress,
    useSameAddress,
  }
}

export const hasCartShippingAddress = (
  address: CartShippingAddressLike | null | undefined,
  email?: string | null
): boolean => {
  if (!address) {
    return false
  }

  return (
    hasValue(address.first_name) &&
    hasValue(address.last_name) &&
    hasValue(address.address_1) &&
    hasValue(address.city) &&
    hasValue(address.postal_code) &&
    hasValue(address.country_code) &&
    hasValue(email)
  )
}
