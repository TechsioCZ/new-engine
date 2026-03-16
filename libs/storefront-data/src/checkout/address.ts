import type {
  StorefrontCartAddressAdapter,
  StorefrontCustomerAddressAdapter,
  StorefrontAddressValidationIssue,
} from "../shared/address"
import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
} from "../customers/medusa-service"
import { hasTrimmedString, normalizeTrimmedString } from "../shared/string-utils"

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


const normalizePresentString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value.trim()
  }

  // Non-string values are treated as absent in patch payloads.
  return
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
  let transformed: string | undefined
  if (trimmedCountryCode) {
    transformed = options?.countryCodeTransform
      ? options.countryCodeTransform(trimmedCountryCode)
      : trimmedCountryCode
  }
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
  firstName: normalizeTrimmedString(address.firstName),
  lastName: normalizeTrimmedString(address.lastName),
  street: normalizeTrimmedString(address.street),
  street2: normalizeTrimmedString(address.street2),
  city: normalizeTrimmedString(address.city),
  postalCode: normalizeTrimmedString(address.postalCode),
  country: normalizeTrimmedString(address.country),
  province: normalizeTrimmedString(address.province),
  company: normalizeTrimmedString(address.company),
  phone: normalizeTrimmedString(address.phone),
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
    if (Object.hasOwn(address, field)) {
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
  requiredFields.filter((field) => !hasTrimmedString(address[field]))

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
      (field) =>
        Object.hasOwn(address, field) && !hasTrimmedString(normalizedAddress[field])
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

  const normalizedEmail = normalizeTrimmedString(data.email)
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

type CheckoutAddressPatchStringField = Exclude<
  CheckoutAddressStringField,
  "country"
>

const checkoutAddressPatchStringFieldMap = [
  ["firstName", "first_name"],
  ["lastName", "last_name"],
  ["street", "address_1"],
  ["street2", "address_2"],
  ["city", "city"],
  ["postalCode", "postal_code"],
  ["province", "province"],
  ["company", "company"],
  ["phone", "phone"],
] as const satisfies readonly [
  CheckoutAddressPatchStringField,
  keyof MedusaCustomerAddressUpdateInput,
][]

const resolvePatchedString = (value: unknown): string =>
  typeof value === "string" ? value : ""

const mapCheckoutAddressPatchToMedusaCustomerAddress = (
  address: Partial<CheckoutAddressInput> & Record<string, unknown>,
  options?: BuildCheckoutCartAddressInputOptions
): MedusaCustomerAddressUpdateInput => {
  const normalized = normalizeCheckoutAddressPatch(address)
  const payload: MedusaCustomerAddressUpdateInput = {}

  for (const [sourceField, targetField] of checkoutAddressPatchStringFieldMap) {
    if (!Object.hasOwn(normalized, sourceField)) {
      continue
    }
    payload[targetField] = resolvePatchedString(normalized[sourceField])
  }

  if (Object.hasOwn(normalized, "country")) {
    payload.country_code = normalizePatchCountryCode(normalized.country, options)
  }
  if (Object.hasOwn(normalized, "isDefaultShipping")) {
    payload.is_default_shipping = address.isDefaultShipping
  }
  if (Object.hasOwn(normalized, "isDefaultBilling")) {
    payload.is_default_billing = address.isDefaultBilling
  }
  if (Object.hasOwn(normalized, "metadata")) {
    payload.metadata = address.metadata ?? undefined
  }

  return payload
}

export const mapMedusaAddressToCheckoutAddress = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  address?: MedusaAddressLike | null
): NormalizedCheckoutAddress<TAddress> => ({
  firstName: normalizeTrimmedString(address?.first_name),
  lastName: normalizeTrimmedString(address?.last_name),
  street: normalizeTrimmedString(address?.address_1),
  street2: normalizeTrimmedString(address?.address_2),
  city: normalizeTrimmedString(address?.city),
  postalCode: normalizeTrimmedString(address?.postal_code),
  country: normalizeTrimmedString(address?.country_code),
  province: normalizeTrimmedString(address?.province),
  company: normalizeTrimmedString(address?.company),
  phone: normalizeTrimmedString(address?.phone),
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
    email: normalizeTrimmedString(data.email),
    shippingAddress,
    billingAddress,
    useSameAddress,
  }
}
