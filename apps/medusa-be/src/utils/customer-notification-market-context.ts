import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  type NotificationMarketContext,
  resolveNotificationMarketContext,
} from "./notification-market-context"

export type CustomerNotificationMarketContextInput = {
  customerId?: string | null
  email?: string | null
}

type CustomerRecord = {
  addresses?: Array<{ country_code?: string | null } | null> | null
  id: string
  metadata?: Record<string, unknown> | null
}

type OrderRecord = {
  billing_address?: { country_code?: string | null } | null
  sales_channel_id?: string | null
  shipping_address?: { country_code?: string | null } | null
}

const normalizeString = (value: string | null | undefined): string =>
  value?.trim() ?? ""

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string => {
  const value = metadata?.[key]

  return typeof value === "string" ? value.trim() : ""
}

const isCustomerRecord = (value: unknown): value is CustomerRecord =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as CustomerRecord).id === "string"

const isOrderRecord = (value: unknown): value is OrderRecord =>
  typeof value === "object" && value !== null

const loadCustomer = async (
  query: Query,
  { customerId, email }: { customerId: string; email: string }
): Promise<CustomerRecord | undefined> => {
  let filters: { email?: string; id?: string }

  if (customerId) {
    filters = email ? { email, id: customerId } : { id: customerId }
  } else {
    filters = { email }
  }

  const result = await query.graph({
    entity: "customer",
    fields: ["id", "metadata", "addresses.country_code"],
    filters,
  })
  const customers = result.data.filter(isCustomerRecord)

  if (customers.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Customer notification market lookup returned multiple customers."
    )
  }

  return customers[0]
}

const loadLatestOrder = async (
  query: Query,
  customer: CustomerRecord | undefined,
  email: string
): Promise<OrderRecord | undefined> => {
  const result = await query.graph({
    entity: "order",
    fields: [
      "sales_channel_id",
      "billing_address.country_code",
      "shipping_address.country_code",
    ],
    filters: customer ? { customer_id: customer.id } : { email },
    pagination: { order: { created_at: "DESC" }, take: 1 },
  })

  return result.data.find(isOrderRecord)
}

export async function resolveCustomerNotificationMarketContext(
  container: MedusaContainer,
  { customerId, email }: CustomerNotificationMarketContextInput
): Promise<NotificationMarketContext> {
  const normalizedCustomerId = normalizeString(customerId)
  const normalizedEmail = normalizeString(email)
  const hasCustomerIdentity = Boolean(normalizedCustomerId || normalizedEmail)

  if (!hasCustomerIdentity) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Customer ID or email is required to resolve the notification market."
    )
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customer = await loadCustomer(query, {
    customerId: normalizedCustomerId,
    email: normalizedEmail,
  })

  if (normalizedCustomerId && !customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Customer was not found while resolving the notification market."
    )
  }

  const metadataSalesChannelId = getMetadataString(
    customer?.metadata,
    "storefront_sales_channel_id"
  )
  const metadataMarketCode = getMetadataString(
    customer?.metadata,
    "storefront_market_code"
  )
  const order = metadataSalesChannelId
    ? undefined
    : await loadLatestOrder(query, customer, normalizedEmail)

  return resolveNotificationMarketContext(container, {
    countryCode:
      metadataMarketCode ||
      order?.shipping_address?.country_code ||
      order?.billing_address?.country_code ||
      customer?.addresses?.[0]?.country_code,
    salesChannelId: metadataSalesChannelId || order?.sales_channel_id,
  })
}
