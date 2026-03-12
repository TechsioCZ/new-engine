import type {
  StorefrontCartAddressAdapter,
  StorefrontCustomerAddressAdapter,
  StorefrontAddressValidationIssue,
} from "../shared/address"
import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
} from "../customers/medusa-service"

export type CheckoutAddressInput = {
  firstName?: string | null
  lastName?: string | null
  street?: string | null
  street2?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  province?: string | null
  company?: string | null
  phone?: string | null
  isDefaultShipping?: boolean
  isDefaultBilling?: boolean
  metadata?: Record<string, unknown>
}

type CheckoutAddressStringField =
  | "firstName"
  | "lastName"
  | "street"
  | "street2"
  | "city"
  | "postalCode"
  | "country"
  | "province"
  | "company"
  | "phone"

export type NormalizedCheckoutAddress<
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
> = Omit<TAddress, CheckoutAddressStringField> & {
  [K in CheckoutAddressStringField]?: string
}

export type CheckoutAddressData<
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
> =
  | {
      shipping: TAddress
      billing?: TAddress
      useSameAddress?: true
      email?: string | null
    }
  | {
      shipping: TAddress
      billing: TAddress
      useSameAddress: false
      email?: string | null
    }

export type CheckoutAddressValidationOptions = {
  requireEmail?: boolean
  shippingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
  billingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
}

export type CheckoutAddressValidationIssue = StorefrontAddressValidationIssue

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

export type CheckoutCustomerAddressPayload = MedusaCustomerAddressCreateInput

export type CheckoutCustomerAddressUpdateInput<
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
> = TAddress & {
  addressId?: string
}

export type MedusaAddressLike = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
  province?: string | null
  company?: string | null
  phone?: string | null
  is_default_shipping?: boolean | null
  is_default_billing?: boolean | null
  metadata?: Record<string, unknown> | null
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

export type CheckoutCartAddressAdapterOptions =
  BuildCheckoutCartAddressInputOptions &
    Pick<
      CheckoutAddressValidationOptions,
      "shippingRequiredFields" | "billingRequiredFields"
    >

export type CheckoutCustomerAddressAdapterOptions =
  BuildCheckoutCartAddressInputOptions & {
    requiredFields?: readonly (keyof CheckoutAddressInput)[]
  }

export type CheckoutMedusaAddressAdapterOptions =
  BuildCheckoutCartAddressInputOptions & {
    shippingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
    billingRequiredFields?: readonly (keyof CheckoutAddressInput)[]
    customerRequiredFields?: readonly (keyof CheckoutAddressInput)[]
  }

export const defaultCheckoutAddressRequiredFields: readonly (keyof CheckoutAddressInput)[] = [
  "firstName",
  "lastName",
  "street",
  "city",
  "postalCode",
  "country",
]

const hasValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const hasOwnField = (
  input: Record<string, unknown>,
  field: keyof CheckoutAddressInput
): boolean => Object.prototype.hasOwnProperty.call(input, field)

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (!hasValue(value)) {
    return
  }
  return value.trim()
}

const createRequiredIssue = (
  scope: "shipping" | "billing" | "customer",
  field: keyof CheckoutAddressInput
): CheckoutAddressValidationIssue => ({
  scope,
  field: String(field),
  code: "required",
  message: `Missing ${scope} field: ${String(field)}`,
})

const normalizeCountryCode = (
  countryCode: string | null | undefined,
  options?: BuildCheckoutCartAddressInputOptions
): string | undefined => {
  const trimmedCountryCode = countryCode?.trim()
  const transformed = trimmedCountryCode
    ? options?.countryCodeTransform
      ? options.countryCodeTransform(trimmedCountryCode)
      : trimmedCountryCode
    : undefined
  const normalized = transformed?.trim()

  if (normalized) {
    return normalized.toLowerCase()
  }

  const defaultCountryCode = options?.defaultCountryCode?.trim()
  if (defaultCountryCode) {
    return defaultCountryCode.toLowerCase()
  }

  return
}

export const normalizeCheckoutAddressInput = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress
): NormalizedCheckoutAddress<TAddress> => {
  const normalized = {
    ...address,
    firstName: normalizeOptionalString(address.firstName),
    lastName: normalizeOptionalString(address.lastName),
    street: normalizeOptionalString(address.street),
    street2: normalizeOptionalString(address.street2),
    city: normalizeOptionalString(address.city),
    postalCode: normalizeOptionalString(address.postalCode),
    country: normalizeOptionalString(address.country),
    province: normalizeOptionalString(address.province),
    company: normalizeOptionalString(address.company),
    phone: normalizeOptionalString(address.phone),
  } satisfies NormalizedCheckoutAddress<TAddress>

  return normalized
}

export const getMissingCheckoutAddressFields = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  requiredFields: readonly (keyof CheckoutAddressInput)[] = defaultCheckoutAddressRequiredFields
): (keyof CheckoutAddressInput)[] =>
  requiredFields.filter((field) => !hasValue(address[field]))

export const hasCheckoutAddressCoreFields = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  requiredFields: readonly (keyof CheckoutAddressInput)[] = defaultCheckoutAddressRequiredFields
): boolean => getMissingCheckoutAddressFields(address, requiredFields).length === 0

export const getCheckoutAddressFieldIssues = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: {
    scope?: "shipping" | "billing" | "customer"
    requiredFields?: readonly (keyof CheckoutAddressInput)[]
  }
): CheckoutAddressValidationIssue[] => {
  const scope = options?.scope ?? "shipping"
  const requiredFields =
    options?.requiredFields ?? defaultCheckoutAddressRequiredFields
  const normalizedAddress = normalizeCheckoutAddressInput(address)

  return getMissingCheckoutAddressFields(
    normalizedAddress,
    requiredFields
  ).map((field) => createRequiredIssue(scope, field))
}

export const getCheckoutAddressPatchFieldIssues = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: {
    scope?: "shipping" | "billing" | "customer"
    requiredFields?: readonly (keyof CheckoutAddressInput)[]
  }
): CheckoutAddressValidationIssue[] => {
  const scope = options?.scope ?? "shipping"
  const requiredFields =
    options?.requiredFields ?? defaultCheckoutAddressRequiredFields
  const normalizedAddress = normalizeCheckoutAddressInput(address)

  return requiredFields
    .filter(
      (field) =>
        hasOwnField(address as Record<string, unknown>, field) &&
        !hasValue(normalizedAddress[field])
    )
    .map((field) => createRequiredIssue(scope, field))
}

export const getCheckoutAddressValidationIssues = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: CheckoutAddressValidationOptions
): CheckoutAddressValidationIssue[] => {
  const issues: CheckoutAddressValidationIssue[] = []
  const requireEmail = options?.requireEmail ?? true
  const shippingRequiredFields =
    options?.shippingRequiredFields ?? defaultCheckoutAddressRequiredFields
  const billingRequiredFields =
    options?.billingRequiredFields ?? defaultCheckoutAddressRequiredFields

  issues.push(
    ...getCheckoutAddressFieldIssues(data.shipping, {
      scope: "shipping",
      requiredFields: shippingRequiredFields,
    })
  )

  if (data.useSameAddress === false) {
    issues.push(
      ...getCheckoutAddressFieldIssues(data.billing, {
        scope: "billing",
        requiredFields: billingRequiredFields,
      })
    )
  }

  const normalizedEmail = normalizeOptionalString(data.email)
  if (requireEmail && !normalizedEmail) {
    issues.push({
      scope: "root",
      field: "email",
      code: "required",
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
    address_2: normalizeOptionalString(address.street2),
    city,
    postal_code: postalCode,
    country_code: countryCode,
    province,
    company,
    phone,
  }
}

export const mapCheckoutAddressToMedusaCustomerAddress = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: BuildCheckoutCartAddressInputOptions
): CheckoutCustomerAddressPayload => {
  const mappedCartAddress = mapCheckoutAddressToMedusaCartAddress(address, options)

  return {
    ...mappedCartAddress,
    is_default_shipping:
      typeof address.isDefaultShipping === "boolean"
        ? address.isDefaultShipping
        : undefined,
    is_default_billing:
      typeof address.isDefaultBilling === "boolean"
        ? address.isDefaultBilling
        : undefined,
    metadata: address.metadata ?? undefined,
  }
}

export const mapMedusaAddressToCheckoutAddress = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  address?: MedusaAddressLike | null
): NormalizedCheckoutAddress<TAddress> => {
  const normalized = {
    firstName: normalizeOptionalString(address?.first_name),
    lastName: normalizeOptionalString(address?.last_name),
    street: normalizeOptionalString(address?.address_1),
    street2: normalizeOptionalString(address?.address_2),
    city: normalizeOptionalString(address?.city),
    postalCode: normalizeOptionalString(address?.postal_code),
    country: normalizeOptionalString(address?.country_code),
    province: normalizeOptionalString(address?.province),
    company: normalizeOptionalString(address?.company),
    phone: normalizeOptionalString(address?.phone),
    isDefaultShipping:
      typeof address?.is_default_shipping === "boolean"
        ? address.is_default_shipping
        : undefined,
    isDefaultBilling:
      typeof address?.is_default_billing === "boolean"
        ? address.is_default_billing
        : undefined,
    metadata: address?.metadata ?? undefined,
  } satisfies NormalizedCheckoutAddress

  return normalized as NormalizedCheckoutAddress<TAddress>
}

export const createCheckoutCartAddressAdapter = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  options?: CheckoutCartAddressAdapterOptions
): StorefrontCartAddressAdapter<TAddress, MedusaCartAddressPayload> => ({
  validate: (input, context) =>
    getCheckoutAddressFieldIssues(input, {
      scope: context.scope,
      requiredFields:
        context.scope === "shipping"
          ? options?.shippingRequiredFields
          : options?.billingRequiredFields,
    }),
  toPayload: (input) => mapCheckoutAddressToMedusaCartAddress(input, options),
})

export const createCheckoutCustomerAddressAdapter = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
  TUpdateInput extends CheckoutCustomerAddressUpdateInput<TAddress> =
    CheckoutCustomerAddressUpdateInput<TAddress>,
>(
  options?: CheckoutCustomerAddressAdapterOptions
): StorefrontCustomerAddressAdapter<
  TAddress,
  MedusaCustomerAddressCreateInput,
  TUpdateInput,
  MedusaCustomerAddressUpdateInput
> => ({
  validateCreate: (input) =>
    getCheckoutAddressFieldIssues(input, {
      scope: "customer",
      requiredFields: options?.requiredFields,
    }),
  toCreateParams: (input) =>
    mapCheckoutAddressToMedusaCustomerAddress(input, options),
  validateUpdate: (input) =>
    getCheckoutAddressPatchFieldIssues(input, {
      scope: "customer",
      requiredFields: options?.requiredFields,
    }),
  toUpdateParams: (input) =>
    mapCheckoutAddressToMedusaCustomerAddress(input, options),
})

export const createCheckoutMedusaAddressAdapters = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
  TUpdateInput extends CheckoutCustomerAddressUpdateInput<TAddress> =
    CheckoutCustomerAddressUpdateInput<TAddress>,
>(
  options?: CheckoutMedusaAddressAdapterOptions
): {
  cart: StorefrontCartAddressAdapter<TAddress, MedusaCartAddressPayload>
  customer: StorefrontCustomerAddressAdapter<
    TAddress,
    MedusaCustomerAddressCreateInput,
    TUpdateInput,
    MedusaCustomerAddressUpdateInput
  >
} => ({
  cart: createCheckoutCartAddressAdapter<TAddress>({
    defaultCountryCode: options?.defaultCountryCode,
    countryCodeTransform: options?.countryCodeTransform,
    shippingRequiredFields: options?.shippingRequiredFields,
    billingRequiredFields: options?.billingRequiredFields,
  }),
  customer: createCheckoutCustomerAddressAdapter<TAddress, TUpdateInput>({
    defaultCountryCode: options?.defaultCountryCode,
    countryCodeTransform: options?.countryCodeTransform,
    requiredFields: options?.customerRequiredFields,
  }),
})

export const buildCheckoutCartAddressInput = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: BuildCheckoutCartAddressInputOptions
): CheckoutCartAddressInput => {
  const useSameAddress = data.useSameAddress !== false
  const shippingAddress = mapCheckoutAddressToMedusaCartAddress(
    data.shipping,
    options
  )
  const billingAddress =
    data.useSameAddress === false
      ? mapCheckoutAddressToMedusaCartAddress(data.billing, options)
      : shippingAddress

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