import type { Query } from "@medusajs/framework/types"

export type PaymentReminderOrder = {
  id: string
  created_at?: Date | string | null
  display_id: number
  custom_display_id?: string | null
  customer_id?: string | null
  email?: string | null
  payment_collections?: { status?: string | null }[] | null
  payment_status?: string | null
  status?: string | null
  summary?: {
    current_order_total?: number | string | null
    original_order_total?: number | string | null
  } | null
  total?: number | string | null
  currency_code?: string | null
}

type PaymentStatus = "not_paid" | "awaiting" | "requires_action"

const BATCH_SIZE = 100
const DEFAULT_MAX_ORDERS = 500
const TRAILING_SLASH_REGEX = /\/$/
export const PAYMENT_REMINDER_MIN_ORDER_AGE_MS = 24 * 60 * 60 * 1000

const UNPAID_PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  "not_paid",
  "awaiting",
  "requires_action",
]

const UNPAID_PAYMENT_STATUSES = new Set<PaymentStatus>(
  UNPAID_PAYMENT_STATUS_VALUES
)

const SKIPPED_ORDER_STATUSES = new Set(["canceled", "archived", "draft"])

const ORDER_FIELDS = [
  "id",
  "created_at",
  "display_id",
  "custom_display_id",
  "customer_id",
  "email",
  "payment_status",
  "payment_collections.status",
  "status",
  "summary.*",
  "total",
  "currency_code",
]

export function getStorefrontUrl() {
  return process.env.STOREFRONT_URL ?? "http://localhost:8000"
}

export function getOrderDisplayId(order: PaymentReminderOrder) {
  return order.custom_display_id ?? `#${order.display_id}`
}

export function getPaymentUrl(order: PaymentReminderOrder) {
  return `${getStorefrontUrl().replace(TRAILING_SLASH_REGEX, "")}/orders/${
    order.id
  }`
}

export function formatTotal(order: PaymentReminderOrder) {
  const total =
    order.summary?.current_order_total ??
    order.summary?.original_order_total ??
    order.total

  if (total === null || total === undefined) {
    return
  }

  const normalizedTotal = typeof total === "string" ? Number(total) : total

  if (!Number.isFinite(normalizedTotal)) {
    return
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: (order.currency_code ?? "CZK").toUpperCase(),
    style: "currency",
  }).format(normalizedTotal)
}

export function isUnpaidOrder(order: PaymentReminderOrder) {
  if (!order.email) {
    return false
  }

  if (order.status && SKIPPED_ORDER_STATUSES.has(order.status)) {
    return false
  }

  const paymentStatus =
    order.payment_status ??
    order.payment_collections?.[0]?.status ??
    (order.payment_collections?.length === 0 ? "not_paid" : undefined)

  return UNPAID_PAYMENT_STATUSES.has(paymentStatus as PaymentStatus)
}

export function isPaymentReminderReadyOrder(
  order: PaymentReminderOrder,
  now = new Date()
) {
  if (!isUnpaidOrder(order)) {
    return false
  }

  if (!order.created_at) {
    return false
  }

  const createdAt = new Date(order.created_at)
  if (Number.isNaN(createdAt.getTime())) {
    return false
  }

  return (
    now.getTime() - createdAt.getTime() >= PAYMENT_REMINDER_MIN_ORDER_AGE_MS
  )
}

export async function fetchOrderById(query: Query, id: string) {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id },
  })

  return (data as PaymentReminderOrder[])[0]
}

export async function fetchUnpaidOrders(
  query: Query,
  maxOrders = DEFAULT_MAX_ORDERS
) {
  const unpaidOrders: PaymentReminderOrder[] = []
  let offset = 0

  while (unpaidOrders.length < maxOrders) {
    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      pagination: {
        skip: offset,
        take: BATCH_SIZE,
      },
    })

    const orders = data as PaymentReminderOrder[]
    unpaidOrders.push(...orders.filter(isUnpaidOrder))

    if (orders.length < BATCH_SIZE) {
      break
    }

    offset += BATCH_SIZE
  }

  return unpaidOrders.slice(0, maxOrders)
}

export function toPaymentReminderOrderResponse(order: PaymentReminderOrder) {
  return {
    currency_code: order.currency_code,
    customer_id: order.customer_id,
    display_id: order.display_id,
    email: order.email,
    id: order.id,
    order_display_id: getOrderDisplayId(order),
    payment_status: order.payment_status,
    status: order.status,
    total: order.total,
    total_formatted: formatTotal(order),
  }
}
