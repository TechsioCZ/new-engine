import type {
  ActionRequiredOrder,
  MedusaAdminCustomer,
  MedusaAdminOrder,
  PendingB2BCustomer,
} from "./types"

const ACTION_REQUIRED_ORDER_STATUS = "pending"
const ACTION_REQUIRED_ORDER_BUSINESS_STATUS = "awaiting_payment"
const ORDER_BUSINESS_STATUS_METADATA_KEY = "order_business_status_manual"
const B2B_CUSTOMER_TYPE_METADATA_KEY = "customer_type"
const B2B_APPROVAL_STATUS_METADATA_KEY = "b2b_approval_status"

const ACTION_REQUIRED_UNPAID_PAYMENT_STATUSES = new Set([
  "authorized",
  "awaiting",
  "canceled",
  "failed",
  "not_paid",
  "requires_action",
])

const AWAITING_PAYMENT_STATUSES = new Set([
  "authorized",
  "awaiting",
  "canceled",
  "failed",
  "not_paid",
  "partially_authorized",
  "partially_captured",
  "requires_action",
])

const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])
const SHIPPED_FULFILLMENT_STATUSES = new Set([
  "partially_delivered",
  "partially_shipped",
  "shipped",
])

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0
}

function getOrderPaymentStatus(order: MedusaAdminOrder) {
  return (
    order.payment_status ??
    order.payment_collections?.find((collection) => collection.status)
      ?.status ??
    (order.payment_collections?.length === 0 ? "not_paid" : undefined)
  )
}

function hasPaidPaymentSignal(order: MedusaAdminOrder) {
  if (hasValue(order.payment_status)) {
    return PAID_PAYMENT_STATUSES.has(order.payment_status)
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? "")
  )
}

function getManualOrderBusinessStatus(order: MedusaAdminOrder) {
  const value = order.metadata?.[ORDER_BUSINESS_STATUS_METADATA_KEY]

  return typeof value === "string" ? value : null
}

function getActiveFulfillments(order: MedusaAdminOrder) {
  return (order.fulfillments ?? []).filter(
    (fulfillment) => !hasValue(fulfillment.canceled_at)
  )
}

function resolveOrderBusinessStatus(order: MedusaAdminOrder) {
  const manualStatus = getManualOrderBusinessStatus(order)

  if (manualStatus === "canceled" || order.status === "canceled") {
    return "canceled"
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
    return "delivered"
  }

  const anyActiveFulfillmentShipped = activeFulfillments.some((fulfillment) =>
    hasValue(fulfillment.shipped_at)
  )

  if (
    SHIPPED_FULFILLMENT_STATUSES.has(order.fulfillment_status ?? "") ||
    anyActiveFulfillmentShipped
  ) {
    return "shipped"
  }

  if (manualStatus === "waiting_for_supplier") {
    return "waiting_for_supplier"
  }

  if (manualStatus === "processing") {
    return "processing"
  }

  const paymentStatus = getOrderPaymentStatus(order)

  if (hasPaidPaymentSignal(order)) {
    return "paid"
  }

  if (AWAITING_PAYMENT_STATUSES.has(paymentStatus ?? "")) {
    return "awaiting_payment"
  }

  return "new"
}

export function isActionRequiredOrder(order: MedusaAdminOrder) {
  if (order.status !== ACTION_REQUIRED_ORDER_STATUS) {
    return false
  }

  if (
    resolveOrderBusinessStatus(order) !== ACTION_REQUIRED_ORDER_BUSINESS_STATUS
  ) {
    return false
  }

  return ACTION_REQUIRED_UNPAID_PAYMENT_STATUSES.has(
    getOrderPaymentStatus(order) ?? ""
  )
}

export function isPendingB2BCustomer(customer: MedusaAdminCustomer) {
  return (
    customer.metadata?.[B2B_CUSTOMER_TYPE_METADATA_KEY] === "b2b" &&
    customer.metadata?.[B2B_APPROVAL_STATUS_METADATA_KEY] === "pending"
  )
}

export function toActionRequiredOrder(
  order: MedusaAdminOrder
): ActionRequiredOrder {
  return {
    created_at: order.created_at ?? null,
    currency_code: order.currency_code ?? null,
    custom_display_id: order.custom_display_id ?? null,
    display_id: order.display_id ?? null,
    email: order.email ?? null,
    id: order.id,
    manual_status: getManualOrderBusinessStatus(order),
    payment_status: getOrderPaymentStatus(order) ?? null,
    status: order.status ?? null,
    total: order.total ?? null,
  }
}

export function toPendingB2BCustomer(
  customer: MedusaAdminCustomer
): PendingB2BCustomer {
  return {
    company_name: customer.company_name ?? null,
    created_at: customer.created_at ?? null,
    email: customer.email ?? null,
    first_name: customer.first_name ?? null,
    id: customer.id,
    last_name: customer.last_name ?? null,
    metadata: customer.metadata ?? {},
    phone: customer.phone ?? null,
  }
}
