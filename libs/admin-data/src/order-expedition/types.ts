import type { CacheConfig } from "../shared/cache-config"
import type { QueryKey, QueryNamespace } from "../shared/query-keys"

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

export const MANUAL_ORDER_BUSINESS_STATUS_IDS = [
  "processing",
  "waiting_for_supplier",
  "canceled",
] as const

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

export type OrderBusinessStatusId = (typeof ORDER_BUSINESS_STATUS_IDS)[number]

export type ManualOrderBusinessStatusId =
  (typeof MANUAL_ORDER_BUSINESS_STATUS_IDS)[number]

export type OrderBusinessStatusTone =
  | "blue"
  | "green"
  | "grey"
  | "orange"
  | "purple"
  | "red"

export type OrderBusinessStatus = {
  id: OrderBusinessStatusId
  priority: number
  tone: OrderBusinessStatusTone
  translation_key: `statuses.${OrderBusinessStatusId}`
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

export type OrderBusinessStatusesByIdsInput = {
  enabled?: boolean
  ids: readonly string[]
}

export type OrderBusinessStatusesByIdsParams = {
  ids: readonly string[]
}

export type OrderBusinessStatusesByIdsResponse = {
  orders: OrderBusinessStatusSummary[]
}

export type OrderBusinessStatusUpdateInput = {
  orderId: string
  status: ManualOrderBusinessStatusId | null
}

export type OrderBusinessStatusUpdateResponse = {
  order: OrderBusinessStatusSummary
}

export type OrderExpeditionCarrierKey =
  (typeof ORDER_EXPEDITION_CARRIER_KEYS)[number]

export type OrderExpeditionTargetStatus =
  (typeof ORDER_EXPEDITION_TARGET_STATUSES)[number]

export type OrderExpeditionCarrierOption = {
  label: string
  value: OrderExpeditionCarrierKey
}

export type OrderExpeditionCarriersResponse = {
  carriers: OrderExpeditionCarrierOption[]
}

export type OrderExpeditionCarrier = OrderExpeditionCarrierOption & {
  shipping_method_id?: string
  shipping_method_name?: string
  shipping_option_id?: string
}

export type OrderExpeditionItem = {
  id?: string | null
  quantity: number
  sku?: string | null
  title: string
  variant?: string | null
}

export type OrderExpeditionOrder = {
  business_status: OrderBusinessStatus
  carrier: OrderExpeditionCarrier
  created_at?: string | null
  currency_code?: string | null
  customer: string
  delivery_address: string[]
  display_id?: number | null
  email?: string | null
  has_active_fulfillment: boolean
  id: string
  items: OrderExpeditionItem[]
  manual_status?: ManualOrderBusinessStatusId | null
  order_display_id: string
  payment_method: string
  payment_status?: string | null
  status?: string | null
  total?: number | string | null
}

export type OrderExpeditionOrdersInput = {
  businessStatus?: OrderBusinessStatusId | "all" | null
  carrier?: OrderExpeditionCarrierKey | "all" | null
  enabled?: boolean
  limit?: number
  offset?: number
}

export type OrderExpeditionOrdersParams = {
  businessStatus: OrderBusinessStatusId | "all"
  carrier: OrderExpeditionCarrierKey | "all"
  limit: number
  offset: number
}

export type OrderExpeditionOrdersResponse = {
  business_status: OrderBusinessStatusId | null
  carrier: OrderExpeditionCarrierKey | null
  carrier_filter_limit_reached: boolean
  count: number
  count_exact: boolean
  has_next: boolean
  limit: number
  offset: number
  orders: OrderExpeditionOrder[]
  scanned_count: number | null
}

export type OrderExpeditionBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

export type OrderExpeditionPdfInput = {
  orderIds: readonly string[]
}

export type OrderExpeditionStatusUpdateInput = {
  orderIds: readonly string[]
  targetStatus: OrderExpeditionTargetStatus
}

export type OrderExpeditionStatusChangedOrder = {
  id: string
  order_display_id: string
  status: string | null
}

export type OrderExpeditionStatusUpdateResponse = {
  count: number
  orders: OrderExpeditionStatusChangedOrder[]
  target_status: OrderExpeditionTargetStatus
}

export type OrderExpeditionStatusUpdateResult =
  | {
      blockedOrders: []
      count: number
      ok: true
      orders: OrderExpeditionStatusChangedOrder[]
      targetStatus: OrderExpeditionTargetStatus
    }
  | {
      blockedOrders: OrderExpeditionBlockingOrder[]
      message: string
      ok: false
      targetStatus?: OrderExpeditionTargetStatus
    }

export type BulkOrderBusinessStatusUpdateInput = {
  orderIds: readonly string[]
  status: ManualOrderBusinessStatusId | null
}

export type BulkOrderBusinessStatusUpdateResponse = {
  count: number
  orders: OrderBusinessStatusSummary[]
  skipped: OrderExpeditionBlockingOrder[]
  skipped_count: number
  status: ManualOrderBusinessStatusId | null
}

export type OrderExpeditionQueryKeys = {
  all: () => QueryKey
  businessStatusesByIds: (params: OrderBusinessStatusesByIdsParams) => QueryKey
  businessStatusesRoot: () => QueryKey
  carriers: () => QueryKey
  orders: (params: OrderExpeditionOrdersParams) => QueryKey
  ordersRoot: () => QueryKey
}

export type OrderExpeditionService = {
  createPdf: (
    input: OrderExpeditionPdfInput,
    signal?: AbortSignal
  ) => Promise<Blob>
  getBusinessStatusesByIds: (
    params: OrderBusinessStatusesByIdsParams,
    signal?: AbortSignal
  ) => Promise<OrderBusinessStatusesByIdsResponse>
  getCarriers: (
    signal?: AbortSignal
  ) => Promise<OrderExpeditionCarriersResponse>
  getOrders: (
    params: OrderExpeditionOrdersParams,
    signal?: AbortSignal
  ) => Promise<OrderExpeditionOrdersResponse>
  bulkUpdateBusinessStatus: (
    input: BulkOrderBusinessStatusUpdateInput
  ) => Promise<BulkOrderBusinessStatusUpdateResponse>
  updateBusinessStatus: (
    input: OrderBusinessStatusUpdateInput
  ) => Promise<OrderBusinessStatusUpdateResponse>
  updateStatus: (
    input: OrderExpeditionStatusUpdateInput
  ) => Promise<OrderExpeditionStatusUpdateResult>
}

export type OrderExpeditionHooksConfig = {
  cacheConfig?: CacheConfig
  queryKeyNamespace?: QueryNamespace
  queryKeys?: OrderExpeditionQueryKeys
  service: OrderExpeditionService
}
