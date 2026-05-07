export const ORDER_EXPEDITION_MAX_ORDER_IDS = 100
export const ORDER_EXPEDITION_DEFAULT_LIMIT = 50
export const ORDER_EXPEDITION_MAX_LIMIT = 100

export const ORDER_EXPEDITION_CARRIER_KEYS = [
  "ppl",
  "packeta",
  "other",
] as const
export const ORDER_EXPEDITION_TARGET_STATUSES = [
  "completed",
  "archived",
  "canceled",
] as const

export type OrderExpeditionCarrierKey =
  (typeof ORDER_EXPEDITION_CARRIER_KEYS)[number]

export type OrderExpeditionTargetStatus =
  (typeof ORDER_EXPEDITION_TARGET_STATUSES)[number]

export type OrderExpeditionCarrierOption = {
  label: string
  value: OrderExpeditionCarrierKey
}

export type OrderExpeditionAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country_code?: string | null
}

export type OrderExpeditionShippingMethod = {
  id?: string | null
  name?: string | null
  shipping_option_id?: string | null
  data?: Record<string, unknown> | null
}

export type OrderExpeditionLineItem = {
  id?: string | null
  title?: string | null
  subtitle?: string | null
  quantity?: number | string | null
  variant_sku?: string | null
  variant_title?: string | null
}

export type OrderExpeditionPayment = {
  provider_id?: string | null
}

export type OrderExpeditionPaymentCollection = {
  status?: string | null
  payments?: OrderExpeditionPayment[] | null
}

export type OrderExpeditionFulfillment = {
  id?: string | null
  canceled_at?: string | null
}

export type OrderExpeditionCustomer = {
  id?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  company_name?: string | null
}

export type OrderExpeditionRawOrder = {
  id: string
  display_id?: number | null
  custom_display_id?: string | null
  email?: string | null
  status?: string | null
  payment_status?: string | null
  customer_id?: string | null
  customer?: OrderExpeditionCustomer | null
  shipping_address?: OrderExpeditionAddress | null
  shipping_methods?: OrderExpeditionShippingMethod[] | null
  fulfillments?: OrderExpeditionFulfillment[] | null
  items?: OrderExpeditionLineItem[] | null
  payment_collections?: OrderExpeditionPaymentCollection[] | null
}

export type ResolvedOrderExpeditionCarrier = OrderExpeditionCarrierOption & {
  shipping_method_id?: string
  shipping_method_name?: string
  shipping_option_id?: string
}

export type OrderExpeditionItemDto = {
  id?: string | null
  title: string
  quantity: number
  sku?: string | null
  variant?: string | null
}

export type OrderExpeditionOrderDto = {
  id: string
  display_id?: number | null
  order_display_id: string
  customer: string
  email?: string | null
  delivery_address: string[]
  carrier: ResolvedOrderExpeditionCarrier
  payment_method: string
  payment_status?: string | null
  status?: string | null
  items: OrderExpeditionItemDto[]
}

export type OrderExpeditionBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

export const ORDER_EXPEDITION_CARRIER_OPTIONS: OrderExpeditionCarrierOption[] =
  [
    { label: "PPL", value: "ppl" },
    { label: "Packeta", value: "packeta" },
    { label: "Other", value: "other" },
  ]

export const ORDER_EXPEDITION_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "status",
  "payment_status",
  "customer_id",
  "customer.id",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.company_name",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.postal_code",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.country_code",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
  "fulfillments.id",
  "fulfillments.canceled_at",
  "items.id",
  "items.title",
  "items.subtitle",
  "items.quantity",
  "items.variant_sku",
  "items.variant_title",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
]

const CARRIER_MATCHERS: Record<
  Exclude<OrderExpeditionCarrierKey, "other">,
  { label: string; tokens: string[] }
> = {
  packeta: {
    label: "Packeta",
    tokens: ["packeta", "zasilkovna", "zasielkovna"],
  },
  ppl: {
    label: "PPL",
    tokens: ["ppl"],
  },
}

export function getOrderExpeditionDisplayId(
  order: Pick<
    OrderExpeditionRawOrder,
    "custom_display_id" | "display_id" | "id"
  >
) {
  return order.custom_display_id || `#${order.display_id ?? order.id}`
}

export function isOrderExpeditionCarrierKey(
  value: string
): value is OrderExpeditionCarrierKey {
  return ORDER_EXPEDITION_CARRIER_KEYS.includes(
    value as OrderExpeditionCarrierKey
  )
}

export function isOrderExpeditionTargetStatus(
  value: string
): value is OrderExpeditionTargetStatus {
  return ORDER_EXPEDITION_TARGET_STATUSES.includes(
    value as OrderExpeditionTargetStatus
  )
}

export function resolveOrderExpeditionCarrier(
  order: Pick<OrderExpeditionRawOrder, "shipping_methods">
): ResolvedOrderExpeditionCarrier {
  for (const shippingMethod of order.shipping_methods ?? []) {
    const searchable = normalizeSearchValue([
      shippingMethod.name,
      shippingMethod.shipping_option_id,
      shippingMethod.data,
    ])

    for (const key of ["ppl", "packeta"] as const) {
      const matcher = CARRIER_MATCHERS[key]
      if (matcher.tokens.some((token) => searchable.includes(token))) {
        return {
          label: matcher.label,
          value: key,
          shipping_method_id: shippingMethod.id ?? undefined,
          shipping_method_name: shippingMethod.name ?? undefined,
          shipping_option_id: shippingMethod.shipping_option_id ?? undefined,
        }
      }
    }
  }

  return { label: "Other", value: "other" }
}

export function orderMatchesExpeditionCarrier(
  order: Pick<OrderExpeditionRawOrder, "shipping_methods">,
  carrier?: OrderExpeditionCarrierKey
) {
  if (!carrier) {
    return true
  }

  return resolveOrderExpeditionCarrier(order).value === carrier
}

export function toOrderExpeditionDto(
  order: OrderExpeditionRawOrder
): OrderExpeditionOrderDto {
  return {
    id: order.id,
    display_id: order.display_id,
    order_display_id: getOrderExpeditionDisplayId(order),
    customer: getOrderExpeditionCustomerName(order),
    email: order.email ?? order.customer?.email ?? null,
    delivery_address: formatOrderExpeditionAddress(order.shipping_address),
    carrier: resolveOrderExpeditionCarrier(order),
    payment_method: getOrderExpeditionPaymentMethod(order),
    payment_status: order.payment_status,
    status: order.status,
    items: (order.items ?? []).map(toOrderExpeditionItemDto),
  }
}

export function toOrderExpeditionBlockingOrder(
  order: Pick<
    OrderExpeditionRawOrder,
    "id" | "custom_display_id" | "display_id"
  >,
  reason: string
): OrderExpeditionBlockingOrder {
  return {
    id: order.id,
    order_display_id: getOrderExpeditionDisplayId(order),
    reason,
  }
}

export function findMissingOrderIds(
  requestedOrderIds: string[],
  orders: Pick<OrderExpeditionRawOrder, "id">[]
) {
  const orderIds = new Set(orders.map((order) => order.id))
  return requestedOrderIds.filter((orderId) => !orderIds.has(orderId))
}

export function orderOrdersByRequestedIds<T extends { id: string }>(
  requestedOrderIds: string[],
  orders: T[]
) {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  return requestedOrderIds
    .map((orderId) => ordersById.get(orderId))
    .filter((order): order is T => Boolean(order))
}

function getOrderExpeditionCustomerName(order: OrderExpeditionRawOrder) {
  const customerName = joinNonEmpty([
    order.customer?.company_name,
    order.customer?.first_name,
    order.customer?.last_name,
  ])

  if (customerName) {
    return customerName
  }

  const shippingName = joinNonEmpty([
    order.shipping_address?.company,
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ])

  return shippingName || order.customer?.email || order.email || order.id
}

function formatOrderExpeditionAddress(address?: OrderExpeditionAddress | null) {
  if (!address) {
    return []
  }

  return [
    joinNonEmpty([address.company]),
    joinNonEmpty([address.first_name, address.last_name]),
    joinNonEmpty([address.address_1, address.address_2]),
    joinNonEmpty([address.postal_code, address.city]),
    joinNonEmpty([address.province]),
    joinNonEmpty([address.country_code?.toUpperCase()]),
  ].filter(Boolean)
}

function getOrderExpeditionPaymentMethod(order: OrderExpeditionRawOrder) {
  const providerId = order.payment_collections
    ?.flatMap((collection) => collection.payments ?? [])
    .find((payment) => payment.provider_id)?.provider_id

  return providerId ?? order.payment_status ?? "Unknown"
}

function toOrderExpeditionItemDto(
  item: OrderExpeditionLineItem
): OrderExpeditionItemDto {
  const quantity = Number(item.quantity ?? 0)

  return {
    id: item.id,
    title: item.title || item.subtitle || item.id || "Untitled item",
    quantity: Number.isFinite(quantity) ? quantity : 0,
    sku: item.variant_sku,
    variant: item.variant_title,
  }
}

function joinNonEmpty(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ")
}

function normalizeSearchValue(value: unknown): string {
  return flattenSearchParts(value)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function flattenSearchParts(value: unknown): string[] {
  if (value === null || value === undefined) {
    return []
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenSearchParts)
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      flattenSearchParts
    )
  }

  return []
}
