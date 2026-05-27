import type {
  AdminDataClient,
  AdminDataRequestOptions,
} from "../shared/admin-client"
import { AdminApiError } from "../shared/error-utils"
import { normalizeOrderIds } from "./query-options"
import type {
  BulkOrderBusinessStatusUpdateInput,
  BulkOrderBusinessStatusUpdateResponse,
  OrderBusinessStatusesByIdsParams,
  OrderBusinessStatusesByIdsResponse,
  OrderBusinessStatusUpdateInput,
  OrderBusinessStatusUpdateResponse,
  OrderExpeditionBlockingOrder,
  OrderExpeditionCarriersResponse,
  OrderExpeditionOrdersParams,
  OrderExpeditionOrdersResponse,
  OrderExpeditionPdfInput,
  OrderExpeditionService,
  OrderExpeditionStatusUpdateInput,
  OrderExpeditionStatusUpdateResponse,
  OrderExpeditionStatusUpdateResult,
  OrderExpeditionTargetStatus,
} from "./types"

export const ORDER_EXPEDITION_DEFAULT_LIST_LIMIT = 50
export const ORDER_EXPEDITION_DEFAULT_LIST_OFFSET = 0

type BlockingStatusPayload = {
  blocked_orders?: unknown
  message?: unknown
  target_status?: unknown
}

function toOrderExpeditionOrdersQuery(params: OrderExpeditionOrdersParams) {
  return {
    ...(params.businessStatus === "all"
      ? {}
      : { business_status: params.businessStatus }),
    ...(params.carrier === "all" ? {} : { carrier: params.carrier }),
    limit: params.limit,
    offset: params.offset,
  } satisfies AdminDataRequestOptions["params"]
}

function isBlockingOrder(
  value: unknown
): value is OrderExpeditionBlockingOrder {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "order_display_id" in value &&
    typeof value.order_display_id === "string" &&
    "reason" in value &&
    typeof value.reason === "string"
  )
}

function getBlockingOrders(payload: unknown) {
  const blockedOrders =
    typeof payload === "object" &&
    payload !== null &&
    "blocked_orders" in payload
      ? (payload as BlockingStatusPayload).blocked_orders
      : undefined

  if (Array.isArray(blockedOrders)) {
    return blockedOrders.filter(isBlockingOrder)
  }

  return []
}

function getPayloadMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as BlockingStatusPayload).message

    if (typeof message === "string") {
      return message
    }
  }

  return fallback
}

function getTargetStatus(
  payload: unknown,
  fallback: OrderExpeditionTargetStatus
) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "target_status" in payload
  ) {
    const targetStatus = (payload as BlockingStatusPayload).target_status

    if (typeof targetStatus === "string") {
      return targetStatus as OrderExpeditionTargetStatus
    }
  }

  return fallback
}

function toStatusUpdateSuccess(
  response: OrderExpeditionStatusUpdateResponse
): OrderExpeditionStatusUpdateResult {
  return {
    blockedOrders: [],
    count: response.count,
    ok: true,
    orders: response.orders,
    targetStatus: response.target_status,
  }
}

function toBlockedStatusUpdateResult(
  error: AdminApiError,
  fallbackTargetStatus: OrderExpeditionTargetStatus
): OrderExpeditionStatusUpdateResult {
  return {
    blockedOrders: getBlockingOrders(error.payload),
    message: getPayloadMessage(error.payload, error.message),
    ok: false,
    targetStatus: getTargetStatus(error.payload, fallbackTargetStatus),
  }
}

export function createMedusaOrderExpeditionService(
  client: AdminDataClient
): OrderExpeditionService {
  function getCarriers(signal?: AbortSignal) {
    return client.fetchJson<OrderExpeditionCarriersResponse>(
      "/admin/order-expedition/carriers",
      { signal }
    )
  }

  function getOrders(
    params: OrderExpeditionOrdersParams,
    signal?: AbortSignal
  ) {
    return client.fetchJson<OrderExpeditionOrdersResponse>(
      "/admin/order-expedition/orders",
      {
        params: toOrderExpeditionOrdersQuery(params),
        signal,
      }
    )
  }

  function getBusinessStatusesByIds(
    params: OrderBusinessStatusesByIdsParams,
    signal?: AbortSignal
  ) {
    const orderIds = normalizeOrderIds(params.ids)

    if (orderIds.length === 0) {
      return Promise.resolve({ orders: [] })
    }

    return client.fetchJson<OrderBusinessStatusesByIdsResponse>(
      "/admin/order-business-statuses/by-ids",
      {
        params: { ids: orderIds.join(",") },
        signal,
      }
    )
  }

  function createPdf(input: OrderExpeditionPdfInput) {
    return client.fetchBlob("/admin/order-expedition/pdf", {
      body: {
        order_ids: normalizeOrderIds(input.orderIds),
      },
      method: "POST",
    })
  }

  async function updateStatus(input: OrderExpeditionStatusUpdateInput) {
    try {
      const response =
        await client.fetchJson<OrderExpeditionStatusUpdateResponse>(
          "/admin/order-expedition/status",
          {
            body: {
              order_ids: normalizeOrderIds(input.orderIds),
              target_status: input.targetStatus,
            },
            method: "POST",
          }
        )

      return toStatusUpdateSuccess(response)
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 400) {
        return toBlockedStatusUpdateResult(error, input.targetStatus)
      }

      throw error
    }
  }

  function updateBusinessStatus(input: OrderBusinessStatusUpdateInput) {
    return client.fetchJson<OrderBusinessStatusUpdateResponse>(
      `/admin/orders/${input.orderId}/business-status`,
      {
        body: { status: input.status },
        method: "POST",
      }
    )
  }

  function bulkUpdateBusinessStatus(input: BulkOrderBusinessStatusUpdateInput) {
    return client.fetchJson<BulkOrderBusinessStatusUpdateResponse>(
      "/admin/order-business-statuses/bulk",
      {
        body: {
          order_ids: normalizeOrderIds(input.orderIds),
          status: input.status,
        },
        method: "POST",
      }
    )
  }

  return {
    bulkUpdateBusinessStatus,
    createPdf,
    getBusinessStatusesByIds,
    getCarriers,
    getOrders,
    updateBusinessStatus,
    updateStatus,
  }
}
