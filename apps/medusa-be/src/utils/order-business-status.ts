import type { MetadataType } from "@medusajs/framework/types"

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

export interface OrderBusinessStatus {
  id: OrderBusinessStatusId
  priority: number
  tone: OrderBusinessStatusTone
  translation_key: `statuses.${OrderBusinessStatusId}`
}

interface OrderBusinessStatusPaymentCollection {
  status?: string | null
}

type OrderBusinessStatusTimestamp = Date | string | null

interface OrderBusinessStatusFulfillment {
  canceled_at?: OrderBusinessStatusTimestamp
  delivered_at?: OrderBusinessStatusTimestamp
  shipped_at?: OrderBusinessStatusTimestamp
}

export interface OrderBusinessStatusInput {
  fulfillment_status?: string | null
  fulfillments?: OrderBusinessStatusFulfillment[] | null
  metadata?: MetadataType
  payment_collections?: OrderBusinessStatusPaymentCollection[] | null
  payment_status?: string | null
  status?: string | null
}

export interface OrderBusinessStatusSummary {
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

const createOrderBusinessStatus = <const TId extends OrderBusinessStatusId>(
  id: TId,
  priority: number,
  tone: OrderBusinessStatusTone,
) => ({
  id,
  priority,
  tone,
  translation_key: `statuses.${id}` as const,
})

export const ORDER_BUSINESS_STATUSES = {
  awaiting_payment: createOrderBusinessStatus("awaiting_payment", 7, "orange"),
  canceled: createOrderBusinessStatus("canceled", 1, "red"),
  delivered: createOrderBusinessStatus("delivered", 2, "green"),
  new: createOrderBusinessStatus("new", 8, "grey"),
  paid: createOrderBusinessStatus("paid", 6, "green"),
  processing: createOrderBusinessStatus("processing", 5, "blue"),
  shipped: createOrderBusinessStatus("shipped", 3, "purple"),
  waiting_for_supplier: createOrderBusinessStatus(
    "waiting_for_supplier",
    4,
    "orange",
  ),
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

const hasValue = (
  value: OrderBusinessStatusTimestamp | undefined,
): value is Date | string =>
  value instanceof Date || (typeof value === "string" && value.length > 0)

const getActiveFulfillments = (order: OrderBusinessStatusInput) =>
  (order.fulfillments ?? []).filter(
    (fulfillment) => !hasValue(fulfillment.canceled_at),
  )

const isIncluded = <const TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): value is TValue =>
  typeof value === "string" && (values as readonly string[]).includes(value)

export const isOrderBusinessStatusId = (
  value: unknown,
): value is OrderBusinessStatusId =>
  isIncluded(ORDER_BUSINESS_STATUS_IDS, value)

export const isActionRequiredOrderBusinessStatusId = (
  value: OrderBusinessStatusId,
) =>
  (
    ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS as readonly OrderBusinessStatusId[]
  ).includes(value)

export const isManualOrderBusinessStatusId = (
  value: unknown,
): value is ManualOrderBusinessStatusId =>
  isIncluded(MANUAL_ORDER_BUSINESS_STATUS_IDS, value)

export const getManualOrderBusinessStatusId = (
  order: OrderBusinessStatusInput,
): ManualOrderBusinessStatusId | undefined => {
  const manualStatus = order.metadata?.[ORDER_BUSINESS_STATUS_METADATA_KEY]

  if (!isManualOrderBusinessStatusId(manualStatus)) {
    return undefined
  }

  return manualStatus
}

const getOrderBusinessPaymentStatus = (order: OrderBusinessStatusInput) =>
  order.payment_status ??
  order.payment_collections?.find(
    (collection) =>
      typeof collection.status === "string" && collection.status.length > 0,
  )?.status ??
  (order.payment_collections?.length === 0 ? "not_paid" : undefined)

export const isPendingUnpaidOrder = (order: OrderBusinessStatusInput) => {
  if (order.status !== "pending") {
    return false
  }

  return PENDING_UNPAID_PAYMENT_STATUSES.has(
    getOrderBusinessPaymentStatus(order) ?? "",
  )
}

const hasPaidPaymentSignal = (order: OrderBusinessStatusInput) => {
  const paymentStatus = order.payment_status

  if (hasValue(paymentStatus)) {
    return PAID_PAYMENT_STATUSES.has(paymentStatus)
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? ""),
  )
}

const formatBusinessStatus = (status: OrderBusinessStatusId) =>
  status.replaceAll("_", " ")

export const resolveOrderBusinessStatus = (
  order: OrderBusinessStatusInput,
): OrderBusinessStatus => {
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
      hasValue(fulfillment.delivered_at),
    )

  if (
    order.fulfillment_status === "delivered" ||
    (canUseFulfillmentTimestampFallback && allActiveFulfillmentsDelivered)
  ) {
    return ORDER_BUSINESS_STATUSES.delivered
  }

  const anyActiveFulfillmentShipped = activeFulfillments.some((fulfillment) =>
    hasValue(fulfillment.shipped_at),
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

export const getOrderBusinessManualStatusUpdateBlockReason = (
  order: OrderBusinessStatusInput,
  status: ManualOrderBusinessStatusId | null,
): string | undefined => {
  const currentManualStatus = getManualOrderBusinessStatusId(order) ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${formatBusinessStatus(status)}`
  }

  if (status === null) {
    return undefined
  }

  const nextOrder = {
    ...order,
    metadata: {
      ...order.metadata,
      [ORDER_BUSINESS_STATUS_METADATA_KEY]: status,
    },
  }
  const nextBusinessStatus = resolveOrderBusinessStatus(nextOrder)

  return nextBusinessStatus.id === status
    ? undefined
    : `${formatBusinessStatus(nextBusinessStatus.id)} status has higher priority`
}
