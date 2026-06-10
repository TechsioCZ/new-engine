import type { Query } from "@medusajs/framework/types"
import { getOrderDisplayId } from "./order-payment-reminders"

export type ReviewRequestOrder = {
  id: string
  customer_id?: string | null
  custom_display_id?: string | null
  display_id: number
  email?: string | null
  payment_collections?:
    | {
        completed_at?: Date | string | null
        payments?: { captured_at?: Date | string | null }[] | null
        status?: string | null
        updated_at?: Date | string | null
      }[]
    | null
  payment_status?: string | null
  status?: string | null
}

const BATCH_SIZE = 100
const DEFAULT_MAX_ORDERS = 500
const DEFAULT_REVIEW_REQUEST_DELAY_MINUTES = 7 * 24 * 60
const MINUTE_IN_MS = 60 * 1000
const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])
const SKIPPED_ORDER_STATUSES = new Set(["canceled", "archived", "draft"])

const ORDER_FIELDS = [
  "id",
  "customer_id",
  "custom_display_id",
  "display_id",
  "email",
  "payment_status",
  "payment_collections.completed_at",
  "payment_collections.payments.captured_at",
  "payment_collections.status",
  "payment_collections.updated_at",
  "status",
]

function getReviewRequestDelayMs() {
  const configuredMinutes = Number(
    process.env.PRODUCT_REVIEW_REQUEST_DELAY_MINUTES
  )

  if (Number.isFinite(configuredMinutes) && configuredMinutes >= 0) {
    return configuredMinutes * MINUTE_IN_MS
  }

  return DEFAULT_REVIEW_REQUEST_DELAY_MINUTES * MINUTE_IN_MS
}

function toDate(value?: Date | string | null) {
  if (!value) {
    return
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function getEarliestDate(dates: Date[]) {
  return dates.reduce<Date | undefined>((earliest, date) => {
    if (!earliest || date.getTime() < earliest.getTime()) {
      return date
    }

    return earliest
  }, undefined)
}

export function getOrderPaidAt(order: ReviewRequestOrder) {
  const paidDates: Date[] = []

  for (const collection of order.payment_collections ?? []) {
    if (!PAID_PAYMENT_STATUSES.has(collection.status ?? "")) {
      continue
    }

    const completedAt = toDate(collection.completed_at)
    if (completedAt) {
      paidDates.push(completedAt)
    }

    for (const payment of collection.payments ?? []) {
      const capturedAt = toDate(payment.captured_at)
      if (capturedAt) {
        paidDates.push(capturedAt)
      }
    }

    const updatedAt = toDate(collection.updated_at)
    if (updatedAt) {
      paidDates.push(updatedAt)
    }
  }

  return getEarliestDate(paidDates)
}

export function isPaidOrder(order: ReviewRequestOrder) {
  if (!order.email) {
    return false
  }

  if (order.status && SKIPPED_ORDER_STATUSES.has(order.status)) {
    return false
  }

  if (PAID_PAYMENT_STATUSES.has(order.payment_status ?? "")) {
    return true
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? "")
  )
}

export function isReviewRequestReadyOrder(
  order: ReviewRequestOrder,
  now = new Date()
) {
  if (!isPaidOrder(order)) {
    return false
  }

  const paidAt = getOrderPaidAt(order)
  if (!paidAt) {
    return false
  }

  return now.getTime() - paidAt.getTime() >= getReviewRequestDelayMs()
}

export async function fetchPaidReviewRequestOrders(
  query: Query,
  maxOrders = DEFAULT_MAX_ORDERS
) {
  const paidOrders: ReviewRequestOrder[] = []
  let offset = 0

  while (paidOrders.length < maxOrders) {
    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      pagination: {
        skip: offset,
        take: BATCH_SIZE,
      },
    })

    const orders = data as ReviewRequestOrder[]
    paidOrders.push(...orders.filter((order) => isPaidOrder(order)))

    if (orders.length < BATCH_SIZE) {
      break
    }

    offset += BATCH_SIZE
  }

  return paidOrders.slice(0, maxOrders)
}

export function getReviewRequestRunAt(order: ReviewRequestOrder) {
  const paidAt = getOrderPaidAt(order)
  if (!paidAt) {
    return
  }

  return new Date(paidAt.getTime() + getReviewRequestDelayMs())
}

export function getReviewRequestMessage() {
  return "Napiš recenzi produktu"
}

export { getOrderDisplayId }
