import crypto from "node:crypto"

import type {
  IAuthModuleService,
  ICustomerModuleService,
  Query,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

export const EMAIL_PASS_PROVIDER = "emailpass"
export const ACCOUNT_SETUP_TOKEN_EXPIRES_IN = "15m"
const ACCOUNT_SETUP_REQUESTED_METADATA_KEY = "account_setup_requested"

export interface AccountSetupOrder {
  id: string
  display_id?: number | null | undefined
  email?: string | null | undefined
  customer_id?: string | null | undefined
  metadata?: Record<string, unknown> | null
  billing_address?: {
    first_name?: string | null | undefined
    last_name?: string | null | undefined
  } | null
  shipping_address?: {
    first_name?: string | null | undefined
    last_name?: string | null | undefined
  } | null
  customer?: {
    id?: string | null | undefined
    email?: string | null | undefined
    first_name?: string | null | undefined
    last_name?: string | null | undefined
    has_account?: boolean | null | undefined
  } | null
}

export interface AccountSetupCustomer {
  id: string
  email?: string | null | undefined
  first_name?: string | null | undefined
  last_name?: string | null | undefined
  has_account?: boolean | null | undefined
}

type AccountSetupSkippedReason =
  | "account_exists"
  | "missing_email"
  | "not_requested"

export interface AccountSetupResult {
  customer_id?: string | undefined
  email?: string | undefined
  order_id: string
  customer_name?: string | undefined
  order_display_id?: string | undefined
  reset_url?: string | undefined
  sent: boolean
  skipped_reason?: AccountSetupSkippedReason | undefined
}

interface EmailPassProviderIdentity {
  auth_identity_id?: string | undefined
  id: string
}

export const ACCOUNT_SETUP_ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "customer_id",
  "metadata",
  "billing_address.first_name",
  "billing_address.last_name",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "customer.id",
  "customer.email",
  "customer.first_name",
  "customer.last_name",
  "customer.has_account",
]

/** Mirrors the truthiness check the plain string conditionals used before. */
const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== ""

export const isAccountSetupRequested = (
  metadata: Record<string, unknown> | null | undefined,
) => metadata?.[ACCOUNT_SETUP_REQUESTED_METADATA_KEY] === true

export const getAccountSetupOrderDisplayId = (order: AccountSetupOrder) => {
  const displayId = order.display_id
  const hasDisplayId =
    displayId !== undefined &&
    displayId !== null &&
    displayId !== 0 &&
    !Number.isNaN(displayId)

  return hasDisplayId ? `#${displayId}` : order.id
}

export const getAccountSetupCustomerName = (order: AccountSetupOrder) => {
  const customerName = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")

  if (customerName) {
    return customerName
  }

  const address = order.billing_address ?? order.shipping_address

  return (
    [address?.first_name, address?.last_name].filter(Boolean).join(" ") ||
    undefined
  )
}

export const buildAccountSetupUrl = (email: string, token: string) => {
  const template = process.env["ACCOUNT_SETUP_URL_TEMPLATE"]

  if (hasText(template)) {
    if (!template.includes("{TOKEN}")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "ACCOUNT_SETUP_URL_TEMPLATE must include {TOKEN} placeholder",
      )
    }

    return template
      .replaceAll("{TOKEN}", encodeURIComponent(token))
      .replaceAll("{EMAIL}", encodeURIComponent(email))
  }

  const storefrontUrl = process.env["STOREFRONT_URL"]

  if (!hasText(storefrontUrl)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL env var is not set — cannot build account setup link",
    )
  }

  return `${storefrontUrl}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
}

const getCustomerCreateData = (order: AccountSetupOrder, email: string) => {
  const address = order.billing_address ?? order.shipping_address

  const firstName = order.customer?.first_name ?? address?.first_name
  const lastName = order.customer?.last_name ?? address?.last_name

  return {
    email,
    ...(hasText(firstName) ? { first_name: firstName } : {}),
    ...(hasText(lastName) ? { last_name: lastName } : {}),
    has_account: false,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

/**
 * Every falsy JavaScript value, matched with `SameValueZero` so `NaN` and `-0`
 * are covered. Rows read from Medusa services are `unknown`, so the original
 * truthiness guards on those rows are reproduced here instead of relying on
 * coercion, which keeps a falsy row on the "no existing record" path.
 */
const FALSY_ROW_VALUES: ReadonlySet<unknown> = new Set([
  undefined,
  null,
  false,
  0,
  0n,
  "",
  Number.NaN,
])

const isPresentRow = (value: unknown) => !FALSY_ROW_VALUES.has(value)

const isOptionalNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string"

const isOptionalNullableBoolean = (value: unknown) =>
  value === undefined || value === null || typeof value === "boolean"

const isOptionalNullableNumber = (value: unknown) =>
  value === undefined || value === null || typeof value === "number"

const isOptionalNullableRecord = (value: unknown) =>
  value === undefined || value === null || isRecord(value)

const isOptionalNullableAddress = (value: unknown) => {
  if (value === undefined || value === null) {
    return true
  }

  return (
    isRecord(value) &&
    isOptionalNullableString(value["first_name"]) &&
    isOptionalNullableString(value["last_name"])
  )
}

const isOptionalNullableOrderCustomer = (value: unknown) => {
  if (value === undefined || value === null) {
    return true
  }

  if (!isRecord(value)) {
    return false
  }

  if (!isOptionalNullableString(value["id"])) {
    return false
  }

  if (!isOptionalNullableString(value["email"])) {
    return false
  }

  if (!isOptionalNullableString(value["first_name"])) {
    return false
  }

  if (!isOptionalNullableString(value["last_name"])) {
    return false
  }

  return isOptionalNullableBoolean(value["has_account"])
}

const isAccountSetupOrder = (value: unknown): value is AccountSetupOrder => {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value["id"] !== "string") {
    return false
  }

  if (!isOptionalNullableNumber(value["display_id"])) {
    return false
  }

  if (!isOptionalNullableString(value["email"])) {
    return false
  }

  if (!isOptionalNullableString(value["customer_id"])) {
    return false
  }

  if (!isOptionalNullableRecord(value["metadata"])) {
    return false
  }

  if (!isOptionalNullableAddress(value["billing_address"])) {
    return false
  }

  if (!isOptionalNullableAddress(value["shipping_address"])) {
    return false
  }

  return isOptionalNullableOrderCustomer(value["customer"])
}

export const assertAccountSetupOrder: (
  value: unknown,
  source: string,
) => asserts value is AccountSetupOrder = (value, source) => {
  if (!isAccountSetupOrder(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid account setup order returned from ${source}`,
    )
  }
}

const isAccountSetupCustomer = (
  value: unknown,
): value is AccountSetupCustomer => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return false
  }

  return (
    isOptionalNullableString(value["email"]) &&
    isOptionalNullableString(value["first_name"]) &&
    isOptionalNullableString(value["last_name"]) &&
    isOptionalNullableBoolean(value["has_account"])
  )
}

const assertAccountSetupCustomer: (
  value: unknown,
  source: string,
) => asserts value is AccountSetupCustomer = (value, source) => {
  if (!isAccountSetupCustomer(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid account setup customer returned from ${source}`,
    )
  }
}

const isEmailPassProviderIdentity = (
  value: unknown,
): value is EmailPassProviderIdentity =>
  isRecord(value) &&
  typeof value["id"] === "string" &&
  (value["auth_identity_id"] === undefined ||
    typeof value["auth_identity_id"] === "string")

const generateTemporaryPassword = () =>
  crypto.randomBytes(32).toString("base64url")

export const getCustomerForAccountSetup = async ({
  customerModuleService,
  email,
  order,
}: {
  customerModuleService: ICustomerModuleService
  email: string
  order: AccountSetupOrder
}): Promise<AccountSetupCustomer> => {
  if (hasText(order.customer?.id)) {
    const orderCustomer: unknown = order.customer
    assertAccountSetupCustomer(orderCustomer, "order.customer")
    return orderCustomer
  }

  const listedCustomers: unknown = await customerModuleService.listCustomers(
    { email },
    { take: 1 },
  )

  if (!isUnknownArray(listedCustomers)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid customer list response for account setup",
    )
  }

  const [existingCustomer] = listedCustomers

  if (isPresentRow(existingCustomer)) {
    assertAccountSetupCustomer(
      existingCustomer,
      "customerModuleService.listCustomers",
    )
    return existingCustomer
  }

  const createdCustomer: unknown = await customerModuleService.createCustomers(
    getCustomerCreateData(order, email),
  )
  assertAccountSetupCustomer(
    createdCustomer,
    "customerModuleService.createCustomers",
  )

  return createdCustomer
}

const getExistingEmailPassIdentity = async (
  query: Query,
  email: string,
): Promise<EmailPassProviderIdentity | undefined> => {
  // `data` stays iterable rather than `unknown[]` so a malformed response keeps
  // throwing here instead of silently registering a fresh auth identity.
  const graphResult: { data: Iterable<unknown> } = await query.graph({
    entity: "provider_identity",
    fields: ["id", "auth_identity_id"],
    filters: {
      entity_id: email,
      provider: EMAIL_PASS_PROVIDER,
    },
  })

  const [providerIdentityResult] = graphResult.data

  if (!isPresentRow(providerIdentityResult)) {
    return undefined
  }

  if (!isEmailPassProviderIdentity(providerIdentityResult)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid emailpass provider identity returned from query.graph",
    )
  }

  return providerIdentityResult
}

export const ensureEmailPassAuthIdentity = async ({
  authModuleService,
  email,
  query,
}: {
  authModuleService: IAuthModuleService
  email: string
  query: Query
}) => {
  const existingIdentity = await getExistingEmailPassIdentity(query, email)
  const existingAuthIdentityId = existingIdentity?.auth_identity_id

  if (hasText(existingAuthIdentityId)) {
    return existingAuthIdentityId
  }

  const registration = await authModuleService.register(EMAIL_PASS_PROVIDER, {
    body: {
      email,
      password: generateTemporaryPassword(),
    },
  })

  if (
    hasText(registration.error) ||
    !registration.success ||
    !registration.authIdentity
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to prepare customer account setup: ${registration.error ?? "unknown error"}`,
    )
  }

  return registration.authIdentity.id
}
