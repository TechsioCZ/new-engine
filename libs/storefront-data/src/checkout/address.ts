import { omitKeys, omitUndefined } from "@techsio/std/object"
import {
  hasTrimmedString,
  normalizePresentTrimmedString,
  normalizeTrimmedString,
} from "@techsio/std/string"

import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
} from "../customers/medusa-service"
import type {
  StorefrontAddressValidationIssue,
  StorefrontCartAddressAdapter,
  StorefrontCustomerAddressAdapter,
} from "../shared/address"

export interface CheckoutAddressInput {
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
  [K in keyof CheckoutAddressInput]-?: NonNullable<
    CheckoutAddressInput[K]
  > extends string
    ? K
    : never
}[keyof CheckoutAddressInput]

type CheckoutAddressValidationScope = "shipping" | "billing" | "customer"

export type NormalizedCheckoutAddress<
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
> = Omit<TAddress, CheckoutAddressStringField> &
  Partial<Record<CheckoutAddressStringField, string>>

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

export interface CheckoutAddressValidationOptions {
  requireEmail?: boolean
  shippingRequiredFields?: readonly CheckoutAddressStringField[]
  billingRequiredFields?: readonly CheckoutAddressStringField[]
}

export type CheckoutAddressValidationIssue = StorefrontAddressValidationIssue

export interface MedusaCartAddressPayload {
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

export interface MedusaAddressLike {
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

export interface BuildCheckoutCartAddressInputOptions {
  defaultCountryCode?: string
  countryCodeTransform?: (countryCode: string) => string
}

export interface CheckoutCartAddressInput {
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

export const defaultCheckoutAddressRequiredFields: readonly CheckoutAddressStringField[] =
  ["firstName", "lastName", "street", "city", "postalCode", "country"]

const createRequiredIssue = (
  scope: CheckoutAddressValidationScope,
  field: CheckoutAddressStringField,
): CheckoutAddressValidationIssue => ({
  code: "required",
  field,
  message: `Missing ${scope} field: ${field}`,
  scope,
})

const normalizeCountryCode = (
  countryCode: string | null | undefined,
  options?: BuildCheckoutCartAddressInputOptions,
): string | undefined => {
  const trimmedCountryCode = countryCode?.trim()
  let transformed: string | undefined
  if (trimmedCountryCode !== undefined && trimmedCountryCode.length > 0) {
    transformed = options?.countryCodeTransform
      ? options.countryCodeTransform(trimmedCountryCode)
      : trimmedCountryCode
  }
  const normalized = transformed?.trim()

  if (normalized !== undefined && normalized.length > 0) {
    return normalized.toLowerCase()
  }

  const defaultCountryCode = options?.defaultCountryCode?.trim()
  if (defaultCountryCode !== undefined && defaultCountryCode.length > 0) {
    return defaultCountryCode.toLowerCase()
  }

  return undefined
}

const normalizePatchCountryCode = (
  countryCode: unknown,
  options?: BuildCheckoutCartAddressInputOptions,
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

const checkoutAddressStringFields = [
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
] as const satisfies readonly CheckoutAddressStringField[]

const normalizeCheckoutAddressInput = <TAddress extends CheckoutAddressInput>(
  address: TAddress,
): TAddress => {
  const normalizedAddress = { ...address }
  const normalizedAddressBase: CheckoutAddressInput = normalizedAddress

  for (const field of checkoutAddressStringFields) {
    Reflect.deleteProperty(normalizedAddressBase, field)
  }

  Object.assign(
    normalizedAddressBase,
    omitUndefined({
      city: normalizeTrimmedString(address.city),
      company: normalizeTrimmedString(address.company),
      country: normalizeTrimmedString(address.country),
      firstName: normalizeTrimmedString(address.firstName),
      lastName: normalizeTrimmedString(address.lastName),
      phone: normalizeTrimmedString(address.phone),
      postalCode: normalizeTrimmedString(address.postalCode),
      province: normalizeTrimmedString(address.province),
      street: normalizeTrimmedString(address.street),
      street2: normalizeTrimmedString(address.street2),
    }),
  )

  return normalizedAddress
}

const normalizeCheckoutAddressPatch = <
  TAddress extends Partial<CheckoutAddressInput>,
>(
  address: TAddress,
): TAddress => {
  const normalizedAddress = { ...address }
  const normalizedRecord: Record<string, unknown> = normalizedAddress

  for (const field of checkoutAddressStringFields) {
    if (Object.hasOwn(address, field)) {
      normalizedRecord[field] = normalizePresentTrimmedString(address[field])
    }
  }

  return normalizedAddress
}

const getMissingCheckoutAddressFields = (
  address: Partial<Record<CheckoutAddressStringField, unknown>>,
  requiredFields: readonly CheckoutAddressStringField[] = defaultCheckoutAddressRequiredFields,
): CheckoutAddressStringField[] =>
  requiredFields.filter((field) => !hasTrimmedString(address[field]))

const getCheckoutAddressFieldIssues = (
  address: CheckoutAddressInput,
  options?: {
    scope?: CheckoutAddressValidationScope
    requiredFields?: readonly CheckoutAddressStringField[]
  },
): CheckoutAddressValidationIssue[] => {
  const scope = options?.scope ?? "shipping"
  const requiredFields =
    options?.requiredFields ?? defaultCheckoutAddressRequiredFields
  const normalizedAddress = normalizeCheckoutAddressInput(address)

  return getMissingCheckoutAddressFields(normalizedAddress, requiredFields).map(
    (field) => createRequiredIssue(scope, field),
  )
}

const getCheckoutAddressPatchFieldIssues = (
  address: Partial<CheckoutAddressInput>,
  options?: {
    scope?: CheckoutAddressValidationScope
    requiredFields?: readonly CheckoutAddressStringField[]
  },
): CheckoutAddressValidationIssue[] => {
  const scope = options?.scope ?? "shipping"
  const requiredFields =
    options?.requiredFields ?? defaultCheckoutAddressRequiredFields
  const normalizedAddress = normalizeCheckoutAddressPatch(address)

  const issues: CheckoutAddressValidationIssue[] = []
  for (const field of requiredFields) {
    if (
      Object.hasOwn(address, field) &&
      !hasTrimmedString(normalizedAddress[field])
    ) {
      issues.push(createRequiredIssue(scope, field))
    }
  }
  return issues
}

export const getCheckoutAddressValidationIssues = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: CheckoutAddressValidationOptions,
): CheckoutAddressValidationIssue[] => {
  const issues: CheckoutAddressValidationIssue[] = []
  const requireEmail = options?.requireEmail ?? true
  const shippingRequiredFields =
    options?.shippingRequiredFields ?? defaultCheckoutAddressRequiredFields
  const billingRequiredFields =
    options?.billingRequiredFields ?? defaultCheckoutAddressRequiredFields

  issues.push(
    ...getCheckoutAddressFieldIssues(data.shipping, {
      requiredFields: shippingRequiredFields,
      scope: "shipping",
    }),
  )

  if (data.useSameAddress === false) {
    issues.push(
      ...getCheckoutAddressFieldIssues(data.billing, {
        requiredFields: billingRequiredFields,
        scope: "billing",
      }),
    )
  }

  const normalizedEmail = normalizeTrimmedString(data.email)
  if (
    requireEmail &&
    (normalizedEmail === undefined || normalizedEmail.length === 0)
  ) {
    issues.push({
      code: "required",
      field: "email",
      message: "Missing checkout email",
      scope: "root",
    })
  }

  return issues
}

export const mapCheckoutAddressToMedusaCartAddress = (
  address: CheckoutAddressInput,
  options?: BuildCheckoutCartAddressInputOptions,
): MedusaCartAddressPayload =>
  omitUndefined({
    address_1: normalizeTrimmedString(address.street),
    address_2: normalizeTrimmedString(address.street2),
    city: normalizeTrimmedString(address.city),
    company: normalizeTrimmedString(address.company),
    country_code: normalizeCountryCode(address.country, options),
    first_name: normalizeTrimmedString(address.firstName),
    last_name: normalizeTrimmedString(address.lastName),
    phone: normalizeTrimmedString(address.phone),
    postal_code: normalizeTrimmedString(address.postalCode),
    province: normalizeTrimmedString(address.province),
  })

const mapCheckoutAddressToMedusaCustomerAddress = (
  address: CheckoutAddressInput,
  options?: BuildCheckoutCartAddressInputOptions,
): MedusaCustomerAddressCreateInput =>
  omitUndefined({
    ...mapCheckoutAddressToMedusaCartAddress(address, options),
    is_default_billing: address.isDefaultBilling,
    is_default_shipping: address.isDefaultShipping,
    metadata: address.metadata,
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

const mapCheckoutAddressPatchToMedusaCustomerAddress = (
  address: Partial<CheckoutAddressInput>,
  options?: BuildCheckoutCartAddressInputOptions,
): MedusaCustomerAddressUpdateInput => {
  const normalized = normalizeCheckoutAddressPatch(address)
  const payload: MedusaCustomerAddressUpdateInput = {}

  for (const [sourceField, targetField] of checkoutAddressPatchStringFieldMap) {
    if (!Object.hasOwn(normalized, sourceField)) {
      continue
    }
    const value = normalized[sourceField]
    payload[targetField] = typeof value === "string" ? value : ""
  }

  if (Object.hasOwn(normalized, "country")) {
    payload.country_code = normalizePatchCountryCode(
      normalized.country,
      options,
    )
  }
  if (
    Object.hasOwn(normalized, "isDefaultShipping") &&
    address.isDefaultShipping !== undefined
  ) {
    payload.is_default_shipping = address.isDefaultShipping
  }
  if (
    Object.hasOwn(normalized, "isDefaultBilling") &&
    address.isDefaultBilling !== undefined
  ) {
    payload.is_default_billing = address.isDefaultBilling
  }
  if (Object.hasOwn(normalized, "metadata") && address.metadata !== undefined) {
    payload.metadata = address.metadata
  }

  return payload
}

export const mapMedusaAddressToCheckoutAddress = (
  address?: MedusaAddressLike | null,
): NormalizedCheckoutAddress =>
  omitUndefined({
    city: normalizeTrimmedString(address?.city),
    company: normalizeTrimmedString(address?.company),
    country: normalizeTrimmedString(address?.country_code),
    firstName: normalizeTrimmedString(address?.first_name),
    isDefaultBilling:
      typeof address?.is_default_billing === "boolean"
        ? address.is_default_billing
        : undefined,
    isDefaultShipping:
      typeof address?.is_default_shipping === "boolean"
        ? address.is_default_shipping
        : undefined,
    lastName: normalizeTrimmedString(address?.last_name),
    metadata: address?.metadata ?? undefined,
    phone: normalizeTrimmedString(address?.phone),
    postalCode: normalizeTrimmedString(address?.postal_code),
    province: normalizeTrimmedString(address?.province),
    street: normalizeTrimmedString(address?.address_1),
    street2: normalizeTrimmedString(address?.address_2),
  })

export const createCheckoutCartAddressAdapter = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
>(
  options?: CheckoutCartAddressAdapterOptions,
): StorefrontCartAddressAdapter<TAddress, MedusaCartAddressPayload> => ({
  normalize: (input) => normalizeCheckoutAddressInput(input),
  toPayload: (input) => mapCheckoutAddressToMedusaCartAddress(input, options),
  validate: (input, context) =>
    getCheckoutAddressFieldIssues(
      input,
      omitUndefined({
        requiredFields:
          context.scope === "shipping"
            ? options?.shippingRequiredFields
            : options?.billingRequiredFields,
        scope: context.scope,
      }),
    ),
})

export const createCheckoutCustomerAddressAdapter = <
  TAddress extends CheckoutAddressInput = CheckoutAddressInput,
  TUpdateInput extends CheckoutCustomerAddressUpdateInput<TAddress> =
    CheckoutCustomerAddressUpdateInput<TAddress>,
>(
  options?: CheckoutCustomerAddressAdapterOptions,
): StorefrontCustomerAddressAdapter<
  TAddress,
  MedusaCustomerAddressCreateInput,
  TUpdateInput,
  MedusaCustomerAddressUpdateInput
> => ({
  normalizeCreate: (input) => normalizeCheckoutAddressInput(input),
  normalizeUpdate: (input) => normalizeCheckoutAddressPatch(input),
  toCreateParams: (input) =>
    mapCheckoutAddressToMedusaCustomerAddress(input, options),
  toUpdateParams: (input) =>
    mapCheckoutAddressPatchToMedusaCustomerAddress(
      omitUndefined(omitKeys(input, ["addressId"])),
      options,
    ),
  validateCreate: (input) =>
    getCheckoutAddressFieldIssues(
      input,
      omitUndefined({
        requiredFields: options?.requiredFields,
        scope: "customer" as const,
      }),
    ),
  validateUpdate: (input) =>
    getCheckoutAddressPatchFieldIssues(
      input,
      omitUndefined({
        requiredFields: options?.requiredFields,
        scope: "customer" as const,
      }),
    ),
})

export const buildCheckoutCartAddressInput = <
  TAddress extends CheckoutAddressInput,
>(
  data: CheckoutAddressData<TAddress>,
  options?: BuildCheckoutCartAddressInputOptions,
): CheckoutCartAddressInput => {
  const useSameAddress = data.useSameAddress !== false
  const shippingAddress = mapCheckoutAddressToMedusaCartAddress(
    data.shipping,
    options,
  )
  const billingAddress =
    data.useSameAddress === false
      ? mapCheckoutAddressToMedusaCartAddress(data.billing, options)
      : shippingAddress

  return omitUndefined({
    billingAddress,
    email: normalizeTrimmedString(data.email),
    shippingAddress,
    useSameAddress,
  })
}
