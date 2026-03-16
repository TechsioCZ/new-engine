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

type CheckoutAddressStringField = {
  [K in keyof CheckoutAddressInput]-?: NonNullable<CheckoutAddressInput[K]> extends string
    ? K
    : never
}[keyof CheckoutAddressInput]

type CheckoutAddressValidationScope = "shipping" | "billing" | "customer"

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
  shippingRequiredFields?: readonly CheckoutAddressStringField[]
  billingRequiredFields?: readonly CheckoutAddressStringField[]
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

export type CheckoutCartAddressAdapterOptions =
  BuildCheckoutCartAddressInputOptions &
    Pick<
      CheckoutAddressValidationOptions,
      "shippingRequiredFields" | "billingRequiredFields"
    >

export type CheckoutCustomerAddressAdapterOptions =
  BuildCheckoutCartAddressInputOptions & {
    requiredFields?: readonly CheckoutAddressStringField[]
  }

export const defaultCheckoutAddressRequiredFields: readonly CheckoutAddressStringField[] = [
  "firstName",
  "lastName",
  "street",
  "city",
  "postalCode",
  "country",
]

const hasValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const hasOwnField = (input: object, field: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(input, field)

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (!hasValue(value)) {
    return
  }

  return value.trim()
}

const normalizePresentString = (value: unknown): string | null | undefined => {
  if (typeof value === "string") {
    return value.trim()
  }

  if (value == null) {
    return value
  }

  return undefined
}

const createRequiredIssue = (
  scope: CheckoutAddressValidationScope,
  field: CheckoutAddressStringField
): CheckoutAddressValidationIssue => ({
  scope,
  field,
  code: "required",
  message: `Missing ${scope} field: ${field}`,
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

const normalizePatchCountryCode = (
  countryCode: unknown,
  options?: BuildCheckoutCartAddressInputOptions
): string => {
  if (typeof countryCode !== "string") {
    return ""
  }

  const trimmedCountryCode = countryCode.trim()
  if (!trimmedCountryCode) {
    return ""
  }

  const transformed = options?.countryCodeTransform
    ? options.countryCodeTransform(trimmedCountryCode)
    : trimmedCountryCode
  const normalized = transformed.trim()

  return normalized ? normalized.toLowerCase() : ""
}

const normalizeCheckoutAddressInput = <TAddress extends CheckoutAddressInput>(
  address: TAddress
): NormalizedCheckoutAddress<TAddress> => ({
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
})

const normalizeCheckoutAddressPatch = <
  TAddress extends Partial<CheckoutAddressInput> & Record<string, unknown>,
>(
  address: TAddress
): TAddress => {
  const normalized: Record<string, unknown> = {
    ...address,
  }

  for (const field of [
    "firstName",
    "lastName",
    "street",
    "street2",
    "city",
    "postalCode",
    "country",
    "province",
    "company",
    "phone",
  ] as const) {
    if (hasOwnField(address, field)) {
      normalized[field] = normalizePresentString(address[field])
    }
  }

  return normalized as TAddress
}

const getMissingCheckoutAddressFields = (
  address: Partial<Record<CheckoutAddressStringField, unknown>>,
  requiredFields: readonly CheckoutAddressStringField[] =
    defaultCheckoutAddressRequiredFields
): CheckoutAddressStringField[] =>
  requiredFields.filter((field) => !hasValue(address[field]))

const getCheckoutAddressFieldIssues = <TAddress extends CheckoutAddressInput>(
  address: TAddress,
  options?: {
    scope?: CheckoutAddressValidationScope
    requiredFields?: readonly CheckoutAddressStringField[]
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

const getCheckoutAddressPatchFieldIssues = <
  TAddress extends Partial<CheckoutAddressInput> & Record<string, unknown>,
>(
  address: TAddress,
  options?: {
    scope?: CheckoutAddressValidationScope
    requiredFields?: readonly CheckoutAddressStringField[]
  }
): CheckoutAddressValidationIssue[] => {
  const scope = options?.scope ?? "shipping"
  const requiredFields =
    options?.requiredFields ?? defaultCheckoutAddressRequiredFields
  const normalizedAddress = normalizeCheckoutAddressPatch(address)

  return requiredFields
    .filter(
      (field) => hasOwnField(address, field) && !hasValue(normalizedAddress[field])
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

export const mapCheckoutAddressToMedusaCartAddress = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: BuildCheckoutCartAddressInputOptions
): MedusaCartAddressPayload => {
  const normalized = normalizeCheckoutAddressInput(address)

  return {
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    address_1: normalized.street,
    address_2: normalized.street2,
    city: normalized.city,
    postal_code: normalized.postalCode,
    country_code: normalizeCountryCode(normalized.country, options),
    province: normalized.province,
    company: normalized.company,
    phone: normalized.phone,
  }
}

const mapCheckoutAddressToMedusaCustomerAddress = <
  TAddress extends CheckoutAddressInput,
>(
  address: TAddress,
  options?: BuildCheckoutCartAddressInputOptions
): MedusaCustomerAddressCreateInput => ({
  ...mapCheckoutAddressToMedusaCartAddress(address, options),
  is_default_shipping: address.isDefaultShipping,
  is_default_billing: address.isDefaultBilling,
  metadata: address.metadata ?? undefined,
})

const mapCheckoutAddressPatchToMedusaCustomerAddress = (
  address: Partial<CheckoutAddressInput> & Record<string, unknown>,
  options?: BuildCheckoutCartAddressInputOptions
): MedusaCustomerAddressUpdateInput => {
  const normalized = normalizeCheckoutAddressPatch(address)
  const payload: MedusaCustomerAddressUpdateInput = {}

  if (hasOwnField(normalized, "firstName")) {
    payload.first_name = typeof normalized.firstName === "string" ? normalized.firstName : ""
  }
  if (hasOwnField(normalized, "lastName")) {
    payload.last_name = typeof normalized.lastName === "string" ? normalized.lastName : ""
  }
  if (hasOwnField(normalized, "street")) {
    payload.address_1 = typeof normalized.street === "string" ? normalized.street : ""
  }
  if (hasOwnField(normalized, "street2")) {
    payload.address_2 = typeof normalized.street2 === "string" ? normalized.street2 : ""
  }
  if (hasOwnField(normalized, "city")) {
    payload.city = typeof normalized.city === "string" ? normalized.city : ""
  }
  if (hasOwnField(normalized, "postalCode")) {
    payload.postal_code =
      typeof normalized.postalCode === "string" ? normalized.postalCode : ""
  }
  if (hasOwnField(normalized, "country")) {
    payload.country_code = normalizePatchCountryCode(normalized.country, options)
  }
  if (hasOwnField(normalized, "province")) {
    payload.province = typeof normalized.province === "string" ? normalized.province : ""
  }
  if (hasOwnField(normalized, "company")) {
    payload.company = typeof normalized.company === "string" ? normalized.company : ""
  }
  if (hasOwnField(normalized, "phone")) {
    payload.phone = typeof normalized.phone === "string" ? normalized.phone : ""
  }
  if (hasOwnField(normalized, "isDefaultShipping")) {
    payload.is_default_shipping = address.isDefaultShipping
  }
  if (hasOwnField(normalized, "isDefaultBilling")) {
    payload.is_default_billing = address.isDefaultBilling
  }
  if (hasOwnField(normalized, "metadata")) {
    payload.metadata = address.metadata ?? undefined
  }

  return payload
}

export const mapMedusaAddressToCheckoutAddress = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  address?: MedusaAddressLike | null
): NormalizedCheckoutAddress<TAddress> => ({
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
}) as NormalizedCheckoutAddress<TAddress>

export const createCheckoutCartAddressAdapter = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  options?: CheckoutCartAddressAdapterOptions
): StorefrontCartAddressAdapter<TAddress, MedusaCartAddressPayload> => ({
  normalize: (input) => normalizeCheckoutAddressInput(input) as TAddress,
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
  normalizeCreate: (input) => normalizeCheckoutAddressInput(input) as TAddress,
  validateCreate: (input) =>
    getCheckoutAddressFieldIssues(input, {
      scope: "customer",
      requiredFields: options?.requiredFields,
    }),
  toCreateParams: (input) =>
    mapCheckoutAddressToMedusaCustomerAddress(input, options),
  normalizeUpdate: (input) => normalizeCheckoutAddressPatch(input),
  validateUpdate: (input) =>
    getCheckoutAddressPatchFieldIssues(input, {
      scope: "customer",
      requiredFields: options?.requiredFields,
    }),
  toUpdateParams: (input) => {
    const { addressId: _addressId, ...rest } = input
    return mapCheckoutAddressPatchToMedusaCustomerAddress(rest, options)
  },
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

  return {
    email: normalizeOptionalString(data.email),
    shippingAddress,
    billingAddress,
    useSameAddress,
  }
}
