export const ORDER_DASHBOARD_PAGE_SIZE = 50
export const ORDER_DASHBOARD_MAX_FULFILLMENT_IDS = 50
export const ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS = 100

export const ORDER_DASHBOARD_CARRIER_KEYS = ["ppl", "packeta", "other"] as const

export const ORDER_DASHBOARD_BUSINESS_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
  "shipped",
  "delivered",
  "canceled",
] as const

export const ORDER_DASHBOARD_BUSINESS_STATUS_GROUP_IDS = [
  "action_required",
] as const

export const ORDER_DASHBOARD_QUEUE_IDS = [
  "all",
  "action_required",
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
  "shipped",
  "delivered",
  "canceled",
] as const

export const ORDER_DASHBOARD_MANUAL_STATUS_IDS = [
  "processing",
  "waiting_for_supplier",
  "canceled",
] as const

export const ORDER_DASHBOARD_TARGET_STATUSES = [
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",
] as const

export type OrderDashboardCarrierKey =
  (typeof ORDER_DASHBOARD_CARRIER_KEYS)[number]

export type OrderDashboardBusinessStatusId =
  (typeof ORDER_DASHBOARD_BUSINESS_STATUS_IDS)[number]

export type OrderDashboardBusinessStatusGroupId =
  (typeof ORDER_DASHBOARD_BUSINESS_STATUS_GROUP_IDS)[number]

export type OrderDashboardQueueId = (typeof ORDER_DASHBOARD_QUEUE_IDS)[number]

export type OrderDashboardManualStatusId =
  (typeof ORDER_DASHBOARD_MANUAL_STATUS_IDS)[number]

export type OrderDashboardTargetStatus =
  (typeof ORDER_DASHBOARD_TARGET_STATUSES)[number]

export type OrderDashboardLabelFormat = "A6" | "A7"

export type OrderDashboardBusinessStatusTone =
  | "blue"
  | "green"
  | "grey"
  | "orange"
  | "purple"
  | "red"

export type OrderDashboardBusinessStatus = {
  id: OrderDashboardBusinessStatusId
  priority: number
  tone: OrderDashboardBusinessStatusTone
  translation_key: `statuses.${OrderDashboardBusinessStatusId}`
}

export type OrderDashboardCarrier = {
  label: string
  value: OrderDashboardCarrierKey
  shipping_method_id?: string
  shipping_method_name?: string
  shipping_option_id?: string
}

export type OrderDashboardItem = {
  id?: string | null
  title: string
  quantity: number
  sku?: string | null
  variant?: string | null
}

export type OrderDashboardOrder = {
  id: string
  business_status: OrderDashboardBusinessStatus
  carrier: OrderDashboardCarrier
  created_at?: string | null
  currency_code?: string | null
  customer: string
  delivery_address: string[]
  display_id?: number | null
  email?: string | null
  fulfillment_status?: string | null
  has_active_fulfillment: boolean
  items: OrderDashboardItem[]
  manual_status?: OrderDashboardManualStatusId | null
  order_display_id: string
  payment_method: string
  payment_status?: string | null
  status?: string | null
  total?: number | string | null
}

export type OrderDashboardPacketaFulfillment = {
  id: string
  canceled_at?: string | null
  data?: {
    barcode?: string
    packet_id?: number
  } | null
  provider_id?: string | null
}

export type OrderDashboardPacketaEligibilityOrder = {
  id: string
  display_id?: number | null
  fulfillments?: OrderDashboardPacketaFulfillment[] | null
}

export type OrderDashboardFulfillmentItem = {
  id: string
  title: string
  quantity: number
  requires_shipping?: boolean | null
  variant_sku?: string | null
  variant_title?: string | null
  detail?: {
    fulfilled_quantity?: number | null
  } | null
  variant?: {
    product?: {
      shipping_profile?: {
        id?: string | null
      } | null
    } | null
  } | null
}

export type OrderDashboardFulfillmentShippingMethod = {
  id?: string | null
  name?: string | null
  shipping_option_id?: string | null
}

export type OrderDashboardFulfillmentOrder = {
  id: string
  display_id?: number | string | null
  no_notification?: boolean | null
  status?: string | null
  items?: OrderDashboardFulfillmentItem[] | null
  shipping_methods?: OrderDashboardFulfillmentShippingMethod[] | null
}

export type OrderDashboardStockLocation = {
  id: string
  name: string
}

export type OrderDashboardShippingOption = {
  id: string
  name: string
  provider_id?: string | null
  shipping_profile_id?: string | null
}

export type OrderDashboardFulfillmentCreateItem = {
  id: string
  quantity: number
}

export type OrderDashboardOrdersResponse = {
  orders: OrderDashboardOrder[]
  count: number
  has_next: boolean
  count_exact: boolean
  carrier_filter_limit_reached: boolean
  scanned_count: number | null
  limit: number
  offset: number
  carrier: OrderDashboardCarrierKey | null
  business_status_group: OrderDashboardBusinessStatusGroupId | null
  business_status: OrderDashboardBusinessStatusId | null
}

export type OrderDashboardSummaryResponse = {
  action_required_count: number
  pending_unpaid_count: number
  scanned_count: number
  status_counts: Record<OrderDashboardBusinessStatusId, number>
  total_count: number
  unhandled_count: number
}

export type OrderDashboardStatusResponse = {
  count: number
  target_status: OrderDashboardTargetStatus
  orders: Array<{
    id: string
    order_display_id: string
    status: string | null
  }>
}

export type OrderDashboardManualStatusResponse = {
  count: number
  skipped_count: number
  status: OrderDashboardManualStatusId | null
  orders: Array<{
    id: string
    business_status: OrderDashboardBusinessStatus
    manual_status?: OrderDashboardManualStatusId | null
  }>
  skipped: Array<{
    id: string
    order_display_id: string
    reason: string
  }>
}
