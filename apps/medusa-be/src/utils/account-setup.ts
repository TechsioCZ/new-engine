import crypto from "node:crypto"

import type {
  IAuthModuleService,
  ICustomerModuleService,
  MetadataType,
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
  metadata?: MetadataType
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

export const isAccountSetupRequested = (metadata: MetadataType | undefined) =>
  metadata?.[ACCOUNT_SETUP_REQUESTED_METADATA_KEY] === true

export const getAccountSetupOrderDisplayId = (order: AccountSetupOrder) => {
  const displayId = order.display_id

  return displayId === undefined || displayId === null
    ? order.id
    : `#${displayId}`
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
    return { ...order.customer, id: order.customer.id }
  }

  const [existingCustomer] = await customerModuleService.listCustomers(
    { email },
    { take: 1 },
  )

  if (existingCustomer !== undefined) {
    return existingCustomer
  }

  return await customerModuleService.createCustomers(
    getCustomerCreateData(order, email),
  )
}

const getExistingEmailPassIdentity = async (
  query: Query,
  email: string,
): Promise<EmailPassProviderIdentity | undefined> => {
  const graphResult: { data: EmailPassProviderIdentity[] } = await query.graph({
    entity: "provider_identity",
    fields: ["id", "auth_identity_id"],
    filters: {
      entity_id: email,
      provider: EMAIL_PASS_PROVIDER,
    },
  })

  const [providerIdentityResult] = graphResult.data

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
