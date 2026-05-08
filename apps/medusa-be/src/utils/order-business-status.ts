export const ORDER_BUSINESS_STATUS_METADATA_KEY =
  "order_business_status_manual" as const

export const ORDER_BUSINESS_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
  "shipped",
  "delivered",
  "canceled",
] as const

export type OrderBusinessStatusId = (typeof ORDER_BUSINESS_STATUS_IDS)[number]

export const MANUAL_ORDER_BUSINESS_STATUS_IDS = [
  "processing",
  "waiting_for_supplier",
  "canceled",
] as const satisfies readonly OrderBusinessStatusId[]

export type ManualOrderBusinessStatusId =
  (typeof MANUAL_ORDER_BUSINESS_STATUS_IDS)[number]

export type OrderBusinessStatusTone =
  | "blue"
  | "green"
  | "grey"
  | "orange"
  | "red"
  | "purple"

export type OrderBusinessStatus = {
  id: OrderBusinessStatusId
  label: string
  priority: number
  tone: OrderBusinessStatusTone
}

export type OrderBusinessStatusPaymentCollection = {
  status?: string | null
}

export type OrderBusinessStatusFulfillment = {
  canceled_at?: Date | string | null
  delivered_at?: Date | string | null
  shipped_at?: Date | string | null
}

export type OrderBusinessStatusInput = {
  fulfillment_status?: string | null
  fulfillments?: OrderBusinessStatusFulfillment[] | null
  metadata?: Record<string, unknown> | null
  payment_collections?: OrderBusinessStatusPaymentCollection[] | null
  payment_status?: string | null
  status?: string | null
}

export type OrderBusinessStatusSummary = {
  business_status: OrderBusinessStatus
  created_at?: string | null
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | null
  email?: string | null
  id: string
  total?: number | string | null
}

export const ORDER_BUSINESS_STATUSES = {
  canceled: {
    id: "canceled",
    label: "Storno",
    priority: 1,
    tone: "red",
  },
  delivered: {
    id: "delivered",
    label: "Doručená",
    priority: 2,
    tone: "green",
  },
  shipped: {
    id: "shipped",
    label: "Expedovaná",
    priority: 3,
    tone: "purple",
  },
  waiting_for_supplier: {
    id: "waiting_for_supplier",
    label: "Čeká na dodavatele",
    priority: 4,
    tone: "orange",
  },
  processing: {
    id: "processing",
    label: "Zpracovává se",
    priority: 5,
    tone: "blue",
  },
  paid: {
    id: "paid",
    label: "Zaplacená",
    priority: 6,
    tone: "green",
  },
  awaiting_payment: {
    id: "awaiting_payment",
    label: "Čeká na platbu",
    priority: 7,
    tone: "orange",
  },
  new: {
    id: "new",
    label: "Nová",
    priority: 8,
    tone: "grey",
  },
} as const satisfies Record<OrderBusinessStatusId, OrderBusinessStatus>

const AWAITING_PAYMENT_STATUSES = new Set([
  "authorized",
  "awaiting",
  "canceled",
  "not_paid",
  "partially_authorized",
  "requires_action",
])

const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])

const SHIPPED_FULFILLMENT_STATUSES = new Set([
  "partially_delivered",
  "partially_shipped",
  "shipped",
])

function hasValue(value: Date | string | null | undefined) {
  return (
    value instanceof Date || (typeof value === "string" && value.length > 0)
  )
}

function getActiveFulfillments(order: OrderBusinessStatusInput) {
  return (order.fulfillments ?? []).filter(
    (fulfillment) => !hasValue(fulfillment.canceled_at)
  )
}

function isIncluded<const TValue extends string>(
  values: readonly TValue[],
  value: unknown
): value is TValue {
  return typeof value === "string" && values.includes(value as TValue)
}

export function isOrderBusinessStatusId(
  value: unknown
): value is OrderBusinessStatusId {
  return isIncluded(ORDER_BUSINESS_STATUS_IDS, value)
}

export function isManualOrderBusinessStatusId(
  value: unknown
): value is ManualOrderBusinessStatusId {
  return isIncluded(MANUAL_ORDER_BUSINESS_STATUS_IDS, value)
}

export function getManualOrderBusinessStatusId(
  order: OrderBusinessStatusInput
): ManualOrderBusinessStatusId | undefined {
  const manualStatus = order.metadata?.[ORDER_BUSINESS_STATUS_METADATA_KEY]

  if (!isManualOrderBusinessStatusId(manualStatus)) {
    return
  }

  return manualStatus
}

export function getOrderBusinessPaymentStatus(order: OrderBusinessStatusInput) {
  return (
    order.payment_status ??
    order.payment_collections?.find((collection) => collection.status)
      ?.status ??
    (order.payment_collections?.length === 0 ? "not_paid" : undefined)
  )
}

function hasPaidPaymentSignal(order: OrderBusinessStatusInput) {
  return (
    PAID_PAYMENT_STATUSES.has(order.payment_status ?? "") ||
    (order.payment_collections ?? []).some((collection) =>
      PAID_PAYMENT_STATUSES.has(collection.status ?? "")
    )
  )
}

export function resolveOrderBusinessStatus(
  order: OrderBusinessStatusInput
): OrderBusinessStatus {
  const manualStatus = getManualOrderBusinessStatusId(order)

  if (manualStatus === "canceled" || order.status === "canceled") {
    return ORDER_BUSINESS_STATUSES.canceled
  }

  const activeFulfillments = getActiveFulfillments(order)
  const hasActiveFulfillments = activeFulfillments.length > 0
  const canUseFulfillmentTimestampFallback = !hasValue(order.fulfillment_status)
  const allActiveFulfillmentsDelivered =
    hasActiveFulfillments &&
    activeFulfillments.every((fulfillment) =>
      hasValue(fulfillment.delivered_at)
    )

  if (
    order.fulfillment_status === "delivered" ||
    (canUseFulfillmentTimestampFallback && allActiveFulfillmentsDelivered)
  ) {
    return ORDER_BUSINESS_STATUSES.delivered
  }

  const anyActiveFulfillmentShipped = activeFulfillments.some((fulfillment) =>
    hasValue(fulfillment.shipped_at)
  )

  if (
    SHIPPED_FULFILLMENT_STATUSES.has(order.fulfillment_status ?? "") ||
    anyActiveFulfillmentShipped
  ) {
    return ORDER_BUSINESS_STATUSES.shipped
  }

  if (manualStatus === "waiting_for_supplier") {
    return ORDER_BUSINESS_STATUSES.waiting_for_supplier
  }

  if (manualStatus === "processing") {
    return ORDER_BUSINESS_STATUSES.processing
  }

  const paymentStatus = getOrderBusinessPaymentStatus(order)

  if (hasPaidPaymentSignal(order)) {
    return ORDER_BUSINESS_STATUSES.paid
  }

  if (AWAITING_PAYMENT_STATUSES.has(paymentStatus ?? "")) {
    return ORDER_BUSINESS_STATUSES.awaiting_payment
  }

  return ORDER_BUSINESS_STATUSES.new
}
