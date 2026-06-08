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

export const ORDER_BUSINESS_STATUS_GROUP_IDS = ["action_required"] as const

export type OrderBusinessStatusGroupId =
  (typeof ORDER_BUSINESS_STATUS_GROUP_IDS)[number]

export const ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
] as const satisfies readonly OrderBusinessStatusId[]

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
  priority: number
  tone: OrderBusinessStatusTone
  translation_key: `statuses.${OrderBusinessStatusId}`
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
  manual_status?: ManualOrderBusinessStatusId | null
  total?: number | string | null
}

function createOrderBusinessStatus<const TId extends OrderBusinessStatusId>(
  id: TId,
  priority: number,
  tone: OrderBusinessStatusTone
) {
  return {
    id,
    priority,
    tone,
    translation_key: `statuses.${id}` as const,
  }
}

export const ORDER_BUSINESS_STATUSES = {
  canceled: createOrderBusinessStatus("canceled", 1, "red"),
  delivered: createOrderBusinessStatus("delivered", 2, "green"),
  shipped: createOrderBusinessStatus("shipped", 3, "purple"),
  waiting_for_supplier: createOrderBusinessStatus(
    "waiting_for_supplier",
    4,
    "orange"
  ),
  processing: createOrderBusinessStatus("processing", 5, "blue"),
  paid: createOrderBusinessStatus("paid", 6, "green"),
  awaiting_payment: createOrderBusinessStatus("awaiting_payment", 7, "orange"),
  new: createOrderBusinessStatus("new", 8, "grey"),
} as const satisfies Record<OrderBusinessStatusId, OrderBusinessStatus>

// Failed/canceled payment attempts still need payment action; only order/manual cancellation maps to Storno.
const AWAITING_PAYMENT_STATUSES = new Set([
  "authorized",
  "awaiting",
  "canceled",
  "failed",
  "not_paid",
  "partially_captured",
  "partially_authorized",
  "requires_action",
])

const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])
const PENDING_UNPAID_PAYMENT_STATUSES = new Set([
  "authorized",
  "awaiting",
  "not_paid",
  "partially_authorized",
  "requires_action",
])

const SHIPPED_FULFILLMENT_STATUSES = new Set([
  "partially_delivered",
  "partially_shipped",
  "shipped",
])

function hasValue(
  value: Date | string | null | undefined
): value is Date | string {
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

export function isActionRequiredOrderBusinessStatusId(
  value: OrderBusinessStatusId
) {
  return (
    ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS as readonly OrderBusinessStatusId[]
  ).includes(value)
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

export function getOrderBusinessManualStatusUpdateBlockReason(
  order: OrderBusinessStatusInput,
  status: ManualOrderBusinessStatusId | null
) {
  const currentManualStatus = getManualOrderBusinessStatusId(order) ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${formatBusinessStatus(status)}`
  }

  if (status === null) {
    return
  }

  const nextOrder = {
    ...order,
    metadata: {
      ...(order.metadata ?? {}),
      [ORDER_BUSINESS_STATUS_METADATA_KEY]: status,
    },
  }
  const nextBusinessStatus = resolveOrderBusinessStatus(nextOrder)

  if (nextBusinessStatus.id !== status) {
    return `${formatBusinessStatus(nextBusinessStatus.id)} status has higher priority`
  }

  return
}

export function getOrderBusinessPaymentStatus(order: OrderBusinessStatusInput) {
  return (
    order.payment_status ??
    order.payment_collections?.find((collection) => collection.status)
      ?.status ??
    (order.payment_collections?.length === 0 ? "not_paid" : undefined)
  )
}

export function isPendingUnpaidOrder(order: OrderBusinessStatusInput) {
  if (order.status !== "pending") {
    return false
  }

  return PENDING_UNPAID_PAYMENT_STATUSES.has(
    getOrderBusinessPaymentStatus(order) ?? ""
  )
}

function hasPaidPaymentSignal(order: OrderBusinessStatusInput) {
  const paymentStatus = order.payment_status

  if (hasValue(paymentStatus)) {
    return PAID_PAYMENT_STATUSES.has(paymentStatus)
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? "")
  )
}

function formatBusinessStatus(status: OrderBusinessStatusId) {
  return status.replace(/_/g, " ")
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
