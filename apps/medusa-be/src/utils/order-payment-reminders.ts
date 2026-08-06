import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const paymentReminderOrderSchema = z.object({
  created_at: z.union([z.date(), z.string(), z.null()]).optional(),
  currency_code: z.string().nullable().optional(),
  custom_display_id: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  display_id: z.union([z.number(), z.string(), z.null()]),
  email: z.string().nullable().optional(),
  id: z.string(),
  payment_collections: z
    .array(z.object({ status: z.string().nullable().optional() }).nullable())
    .nullable()
    .optional(),
  payment_status: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  summary: z
    .object({
      current_order_total: z
        .union([z.number(), z.string(), z.null()])
        .optional(),
      original_order_total: z
        .union([z.number(), z.string(), z.null()])
        .optional(),
    })
    .nullable()
    .optional(),
  total: z.union([z.number(), z.string(), z.null()]).optional(),
})

export type PaymentReminderOrder = z.infer<typeof paymentReminderOrderSchema>

const parsePaymentReminderOrders = (
  value: unknown,
  context: string,
): PaymentReminderOrder[] => {
  if (!Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Order query returned non-array data for ${context}`,
    )
  }

  const parsed = z.array(paymentReminderOrderSchema).safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Order query returned invalid data for ${context}`,
    )
  }
  return parsed.data
}

type PaymentStatus = "not_paid" | "awaiting" | "requires_action"

const BATCH_SIZE = 100
const DEFAULT_MAX_ORDERS = 500
const TRAILING_SLASH_REGEX = /\/$/u
const PAYMENT_REMINDER_MIN_ORDER_AGE_MS = 24 * 60 * 60 * 1000

const UNPAID_PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  "not_paid",
  "awaiting",
  "requires_action",
]

const SKIPPED_ORDER_STATUSES = new Set(["canceled", "archived", "draft"])

export const ORDER_FIELDS = [
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
  // Selecting `total` makes the order module load shipping-method adjustments,
  // and it only selects the shipping method's `version` alongside them when the
  // requested fields already reach into the shipping method. Without this entry
  // the module throws "Shipping method version is required to load adjustments".
  "shipping_methods.id",
]

export const getStorefrontUrl = () =>
  process.env["STOREFRONT_URL"] ?? "http://localhost:8000"

export const getOrderDisplayId = (order: PaymentReminderOrder) =>
  order.custom_display_id ?? `#${order.display_id}`

export const getPaymentUrl = (order: PaymentReminderOrder) =>
  `${getStorefrontUrl().replace(TRAILING_SLASH_REGEX, "")}/orders/${order.id}`

export const formatTotal = (
  order: PaymentReminderOrder,
): string | undefined => {
  const total =
    order.summary?.current_order_total ??
    order.summary?.original_order_total ??
    order.total

  if (total === null || total === undefined) {
    return undefined
  }

  const normalizedTotal = typeof total === "string" ? Number(total) : total

  if (!Number.isFinite(normalizedTotal)) {
    return undefined
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: (order.currency_code ?? "CZK").toUpperCase(),
    style: "currency",
  }).format(normalizedTotal)
}

const isUnpaidOrder = (order: PaymentReminderOrder) => {
  if (typeof order.email !== "string" || order.email.length === 0) {
    return false
  }

  if (
    typeof order.status === "string" &&
    SKIPPED_ORDER_STATUSES.has(order.status)
  ) {
    return false
  }

  const paymentStatus =
    order.payment_status ??
    order.payment_collections?.[0]?.status ??
    (order.payment_collections?.length === 0 ? "not_paid" : undefined)

  return UNPAID_PAYMENT_STATUS_VALUES.some((status) => status === paymentStatus)
}

export const isPaymentReminderReadyOrder = (
  order: PaymentReminderOrder,
  now = new Date(),
) => {
  if (!isUnpaidOrder(order)) {
    return false
  }

  if (order.created_at === null || order.created_at === undefined) {
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

export const fetchOrderById = async (
  query: Query,
  id: string,
): Promise<PaymentReminderOrder | undefined> => {
  const result: unknown = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id },
  })
  if (typeof result !== "object" || result === null || !("data" in result)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Order query returned an invalid result for order ${id}`,
    )
  }

  return parsePaymentReminderOrders(result.data, `order ${id}`)[0]
}

const fetchUnpaidOrderBatch = async (
  query: Query,
  offset: number,
  remainingOrders: number,
): Promise<PaymentReminderOrder[]> => {
  if (remainingOrders === 0) {
    return []
  }
  const take = Math.min(BATCH_SIZE, remainingOrders)
  const result: unknown = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    pagination: { skip: offset, take },
  })
  if (typeof result !== "object" || result === null || !("data" in result)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Order query returned an invalid result at offset ${offset}`,
    )
  }

  const orders = parsePaymentReminderOrders(result.data, `offset ${offset}`)
  const unpaidOrders = orders.filter(isUnpaidOrder)
  if (orders.length < take) {
    return unpaidOrders
  }
  const remaining = await fetchUnpaidOrderBatch(
    query,
    offset + take,
    remainingOrders - take,
  )
  return [...unpaidOrders, ...remaining]
}

export const fetchUnpaidOrders = async (
  query: Query,
  maxOrders = DEFAULT_MAX_ORDERS,
) => {
  const boundedMaxOrders = Number.isSafeInteger(maxOrders)
    ? Math.max(0, Math.min(maxOrders, DEFAULT_MAX_ORDERS))
    : DEFAULT_MAX_ORDERS
  return await fetchUnpaidOrderBatch(query, 0, boundedMaxOrders)
}

export const toPaymentReminderOrderResponse = (
  order: PaymentReminderOrder,
) => ({
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
})
