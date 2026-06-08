import type { Query } from "@medusajs/framework/types"
import {
  getManualOrderBusinessStatusId,
  type ManualOrderBusinessStatusId,
  type OrderBusinessStatus,
  type OrderBusinessStatusInput,
  resolveOrderBusinessStatus,
} from "./order-business-status"

export const ORDER_EXPEDITION_MAX_ORDER_IDS = 1000
export const ORDER_EXPEDITION_DEFAULT_LIMIT = 50
export const ORDER_EXPEDITION_MAX_LIMIT = 100

export const ORDER_EXPEDITION_CARRIER_KEYS = [
  "ppl",
  "packeta",
  "other",
] as const
export const ORDER_EXPEDITION_TARGET_STATUSES = [
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",
] as const

const ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS = {
  archived: [],
  canceled: ["archived"],
  completed: ["archived"],
  draft: ["pending", "requires_action", "completed", "canceled", "archived"],
  pending: ["draft", "requires_action", "completed", "canceled"],
  requires_action: ["draft", "pending", "completed", "canceled"],
} as const satisfies Record<
  OrderExpeditionTargetStatus,
  readonly OrderExpeditionTargetStatus[]
>

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
  quantity?: number | string | { value?: number | string | null } | null
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

type OrderExpeditionRawAmount = {
  value?: number | string | null
}

type OrderExpeditionAmountLike = {
  valueOf(): unknown
}

type OrderExpeditionSummaryTotals = {
  current_order_total?: number | string | null
  original_order_total?: number | string | null
  raw_current_order_total?: OrderExpeditionRawAmount | null
  raw_original_order_total?: OrderExpeditionRawAmount | null
}

export type OrderExpeditionSummary = {
  current_order_total?: number | string | null
  original_order_total?: number | string | null
  raw_current_order_total?: OrderExpeditionRawAmount | null
  raw_original_order_total?: OrderExpeditionRawAmount | null
  totals?: OrderExpeditionSummaryTotals | null
  version?: number | string | null
}

export type OrderExpeditionFulfillment = {
  id?: string | null
  canceled_at?: string | null
  delivered_at?: Date | string | null
  shipped_at?: Date | string | null
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
  created_at?: Date | string | null
  currency_code?: string | null
  display_id?: number | null
  custom_display_id?: string | null
  email?: string | null
  status?: string | null
  is_draft_order?: boolean | null
  fulfillment_status?: string | null
  metadata?: Record<string, unknown> | null
  payment_status?: string | null
  summary?: OrderExpeditionSummary | OrderExpeditionSummary[] | null
  total?: number | string | OrderExpeditionAmountLike | null
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
  business_status: OrderBusinessStatus
  created_at?: string | null
  currency_code?: string | null
  display_id?: number | null
  order_display_id: string
  customer: string
  email?: string | null
  delivery_address: string[]
  carrier: ResolvedOrderExpeditionCarrier
  payment_method: string
  payment_status?: string | null
  fulfillment_status?: string | null
  status?: string | null
  manual_status?: ManualOrderBusinessStatusId | null
  total?: number | string | null
  has_active_fulfillment: boolean
  items: OrderExpeditionItemDto[]
}

export type OrderExpeditionBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

type OrderExpeditionTransitionOrder = {
  status?: string | null
  fulfillments?: OrderExpeditionFulfillment[] | null
  has_active_fulfillment?: boolean | null
}

export const ORDER_EXPEDITION_CARRIER_OPTIONS: OrderExpeditionCarrierOption[] =
  [
    { label: "PPL", value: "ppl" },
    { label: "Packeta", value: "packeta" },
    { label: "Other", value: "other" },
  ]

export const ORDER_EXPEDITION_ORDER_FIELDS = [
  "id",
  "created_at",
  "currency_code",
  "display_id",
  "custom_display_id",
  "email",
  "status",
  "is_draft_order",
  "fulfillment_status",
  "metadata",
  "payment_status",
  "summary.*",
  "total",
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
  "fulfillments.delivered_at",
  "fulfillments.shipped_at",
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
const CARRIER_TOKEN_SEPARATOR_REGEX = /[^a-z0-9]+/u

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
  return ORDER_EXPEDITION_CARRIER_KEYS.some((carrier) => carrier === value)
}

export function isOrderExpeditionTargetStatus(
  value: string
): value is OrderExpeditionTargetStatus {
  return ORDER_EXPEDITION_TARGET_STATUSES.some((status) => status === value)
}

export function isOrderExpeditionRawOrder(
  value: unknown
): value is OrderExpeditionRawOrder {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
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
    const searchableTokens = new Set(
      searchable.split(CARRIER_TOKEN_SEPARATOR_REGEX).filter(Boolean)
    )

    for (const key of ["ppl", "packeta"] as const) {
      const matcher = CARRIER_MATCHERS[key]
      if (matcher.tokens.some((token) => searchableTokens.has(token))) {
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

export function hasOrderExpeditionActiveFulfillment(
  order: Pick<
    OrderExpeditionTransitionOrder,
    "fulfillments" | "has_active_fulfillment"
  >
) {
  if (typeof order.has_active_fulfillment === "boolean") {
    return order.has_active_fulfillment
  }

  return Boolean(
    order.fulfillments?.some((fulfillment) => !fulfillment.canceled_at)
  )
}

export function getOrderExpeditionTransitionBlockReason(
  order: OrderExpeditionTransitionOrder,
  targetStatus: OrderExpeditionTargetStatus
) {
  const currentStatus = order.status

  if (!currentStatus) {
    return "Order status is unknown"
  }

  if (currentStatus === targetStatus) {
    return `Order is already ${formatStatusForReason(targetStatus)}`
  }

  if (!isOrderExpeditionTransitionSourceStatus(currentStatus)) {
    return `Order status ${formatStatusForReason(currentStatus)} cannot be changed`
  }

  if (currentStatus === "archived") {
    return "Archived orders cannot be changed"
  }

  if (currentStatus === "canceled" && targetStatus !== "archived") {
    return "Canceled orders can only be archived"
  }

  if (currentStatus === "completed" && targetStatus === "canceled") {
    return "Completed orders cannot be canceled"
  }

  if (currentStatus === "completed" && targetStatus !== "archived") {
    return "Completed orders can only be archived"
  }

  if (
    targetStatus === "canceled" &&
    hasOrderExpeditionActiveFulfillment(order)
  ) {
    return "Orders with active fulfillments cannot be canceled"
  }

  const allowedTargetStatuses: readonly OrderExpeditionTargetStatus[] =
    ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS[currentStatus]

  if (!allowedTargetStatuses.includes(targetStatus)) {
    return `${formatStatusSubject(currentStatus)} orders cannot be changed to ${formatStatusForReason(targetStatus)}`
  }

  return
}

export function toOrderExpeditionDto(
  order: OrderExpeditionRawOrder
): OrderExpeditionOrderDto {
  return {
    id: order.id,
    business_status: resolveOrderBusinessStatus(
      order as OrderBusinessStatusInput
    ),
    created_at: normalizeDate(order.created_at),
    currency_code: order.currency_code,
    display_id: order.display_id,
    order_display_id: getOrderExpeditionDisplayId(order),
    customer: getOrderExpeditionCustomerName(order),
    email: order.email ?? order.customer?.email ?? null,
    delivery_address: formatOrderExpeditionAddress(order.shipping_address),
    carrier: resolveOrderExpeditionCarrier(order),
    payment_method: getOrderExpeditionPaymentMethod(order),
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    status: order.status,
    manual_status: getManualOrderBusinessStatusId(order) ?? null,
    total: getOrderExpeditionTotal(order),
    has_active_fulfillment: hasOrderExpeditionActiveFulfillment(order),
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

export async function fetchOrderExpeditionOrdersByIds(
  query: Query,
  orderIds: string[]
) {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters: {
      id: orderIds,
    },
  })

  return Array.isArray(data) ? data.filter(isOrderExpeditionRawOrder) : []
}

export async function fetchOrderedOrderExpeditionOrdersByIds(
  query: Query,
  orderIds: string[]
) {
  const orders = await fetchOrderExpeditionOrdersByIds(query, orderIds)

  return {
    missingOrderIds: findMissingOrderIds(orderIds, orders),
    orders: orderOrdersByRequestedIds(orderIds, orders),
  }
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

function getOrderExpeditionTotal(order: OrderExpeditionRawOrder) {
  const orderTotal = normalizeOrderExpeditionAmount(order.total)
  const summaryTotal = getLatestOrderExpeditionSummaryTotal(order.summary)

  if (isNonZeroAmount(orderTotal) || summaryTotal === undefined) {
    return orderTotal ?? null
  }

  return summaryTotal
}

function getLatestOrderExpeditionSummaryTotal(
  summary: OrderExpeditionRawOrder["summary"]
) {
  const summaries = (Array.isArray(summary) ? summary : summary ? [summary] : [])
    .slice()
    .sort(
      (left, right) =>
        getOrderExpeditionSummaryVersion(right) -
        getOrderExpeditionSummaryVersion(left)
    )

  for (const entry of summaries) {
    const amount =
      getOrderExpeditionSummaryAmount(
        entry.current_order_total,
        entry.raw_current_order_total
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.totals?.current_order_total,
        entry.totals?.raw_current_order_total
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.original_order_total,
        entry.raw_original_order_total
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.totals?.original_order_total,
        entry.totals?.raw_original_order_total
      )

    if (amount !== undefined) {
      return amount
    }
  }

  return
}

function getOrderExpeditionSummaryAmount(
  amount: number | string | null | undefined,
  rawAmount: OrderExpeditionRawAmount | null | undefined
) {
  const normalizedAmount = normalizeOrderExpeditionAmount(amount)
  const normalizedRawAmount = normalizeOrderExpeditionAmount(rawAmount)

  if (isNonZeroAmount(normalizedAmount) || normalizedRawAmount === undefined) {
    return normalizedAmount
  }

  return normalizedRawAmount
}

function getOrderExpeditionSummaryVersion(summary: OrderExpeditionSummary) {
  const version = Number(summary.version ?? 0)

  return Number.isFinite(version) ? version : 0
}

function normalizeOrderExpeditionAmount(
  value:
    | OrderExpeditionAmountLike
    | OrderExpeditionRawAmount
    | OrderExpeditionRawOrder["total"]
    | null
    | undefined
): number | string | undefined {
  if (typeof value === "object" && value !== null) {
    if ("value" in value) {
      return normalizeOrderExpeditionAmount(value.value)
    }

    const primitive = value.valueOf()

    if (typeof primitive === "number" || typeof primitive === "string") {
      return normalizeOrderExpeditionAmount(primitive)
    }

    return
  }

  const amount = value

  return amount === "" || amount === null || amount === undefined
    ? undefined
    : amount
}

function isNonZeroAmount(value: number | string | undefined) {
  const amount = Number(value)

  return Number.isFinite(amount) && amount !== 0
}

function toOrderExpeditionItemDto(
  item: OrderExpeditionLineItem
): OrderExpeditionItemDto {
  const quantity = getOrderExpeditionItemQuantity(item.quantity)

  return {
    id: item.id,
    title: item.title || item.subtitle || item.id || "Untitled item",
    quantity,
    sku: item.variant_sku,
    variant: item.variant_title,
  }
}

function getOrderExpeditionItemQuantity(
  quantity: OrderExpeditionLineItem["quantity"]
) {
  const value =
    typeof quantity === "object" && quantity !== null && "value" in quantity
      ? quantity.value
      : quantity
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function joinNonEmpty(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ")
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value ?? null
}

function isOrderExpeditionTransitionSourceStatus(
  value: string
): value is keyof typeof ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS {
  return value in ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS
}

function formatStatusForReason(status: string) {
  return status.replace(/_/g, " ")
}

function formatStatusSubject(status: string) {
  const formatted = formatStatusForReason(status)
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
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
