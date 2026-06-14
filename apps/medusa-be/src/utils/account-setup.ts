import crypto from "node:crypto"
import type {
  IAuthModuleService,
  ICustomerModuleService,
  Query,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

export const EMAIL_PASS_PROVIDER = "emailpass"
export const ACCOUNT_SETUP_TOKEN_EXPIRES_IN = "15m"
export const ACCOUNT_SETUP_REQUESTED_METADATA_KEY = "account_setup_requested"

export type AccountSetupOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  customer_id?: string | null
  metadata?: Record<string, unknown> | null
  billing_address?: {
    first_name?: string | null
    last_name?: string | null
  } | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
  } | null
  customer?: {
    id?: string | null
    email?: string | null
    first_name?: string | null
    last_name?: string | null
    has_account?: boolean | null
  } | null
}

export type AccountSetupCustomer = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  has_account?: boolean | null
}

export type AccountSetupResult = {
  customer_id?: string
  email?: string
  order_id: string
  customer_name?: string
  order_display_id?: string
  reset_url?: string
  sent: boolean
  skipped_reason?: "account_exists" | "missing_email" | "not_requested"
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

export function isAccountSetupRequested(
  metadata: Record<string, unknown> | null | undefined
) {
  return metadata?.[ACCOUNT_SETUP_REQUESTED_METADATA_KEY] === true
}

export function getAccountSetupOrderDisplayId(order: AccountSetupOrder) {
  return order.display_id ? `#${order.display_id}` : order.id
}

export function getAccountSetupCustomerName(order: AccountSetupOrder) {
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

export function buildAccountSetupUrl(email: string, token: string) {
  const template = process.env.ACCOUNT_SETUP_URL_TEMPLATE

  if (template) {
    if (!template.includes("{TOKEN}")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "ACCOUNT_SETUP_URL_TEMPLATE must include {TOKEN} placeholder"
      )
    }

    return template
      .replaceAll("{TOKEN}", encodeURIComponent(token))
      .replaceAll("{EMAIL}", encodeURIComponent(email))
  }

  const storefrontUrl = process.env.STOREFRONT_URL

  if (!storefrontUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL env var is not set — cannot build account setup link"
    )
  }

  return `${storefrontUrl}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
}

function getCustomerCreateData(order: AccountSetupOrder, email: string) {
  const address = order.billing_address ?? order.shipping_address

  return {
    email,
    first_name: order.customer?.first_name ?? address?.first_name ?? undefined,
    last_name: order.customer?.last_name ?? address?.last_name ?? undefined,
    has_account: false,
  }
}

function generateTemporaryPassword() {
  return crypto.randomBytes(32).toString("base64url")
}

export async function getCustomerForAccountSetup({
  customerModuleService,
  email,
  order,
}: {
  customerModuleService: ICustomerModuleService
  email: string
  order: AccountSetupOrder
}): Promise<AccountSetupCustomer> {
  if (order.customer?.id) {
    return order.customer as AccountSetupCustomer
  }

  const [existingCustomer] = await customerModuleService.listCustomers(
    { email },
    { take: 1 }
  )

  if (existingCustomer) {
    return existingCustomer as AccountSetupCustomer
  }

  return (await customerModuleService.createCustomers(
    getCustomerCreateData(order, email)
  )) as AccountSetupCustomer
}

async function getExistingEmailPassIdentity(
  query: Query,
  email: string
): Promise<{ auth_identity_id?: string; id: string } | undefined> {
  const {
    data: [providerIdentity],
  } = await query.graph({
    entity: "provider_identity",
    fields: ["id", "auth_identity_id"],
    filters: {
      entity_id: email,
      provider: EMAIL_PASS_PROVIDER,
    },
  })

  return providerIdentity as
    | { auth_identity_id?: string; id: string }
    | undefined
}

export async function ensureEmailPassAuthIdentity({
  authModuleService,
  email,
  query,
}: {
  authModuleService: IAuthModuleService
  email: string
  query: Query
}) {
  const existingIdentity = await getExistingEmailPassIdentity(query, email)

  if (existingIdentity?.auth_identity_id) {
    return existingIdentity.auth_identity_id
  }

  const registration = await authModuleService.register(EMAIL_PASS_PROVIDER, {
    body: {
      email,
      password: generateTemporaryPassword(),
    },
  })

  if (
    registration.error ||
    !registration.success ||
    !registration.authIdentity
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to prepare customer account setup: ${registration.error ?? "unknown error"}`
    )
  }

  return registration.authIdentity.id
}
