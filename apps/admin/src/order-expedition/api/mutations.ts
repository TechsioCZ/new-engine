import type { QueryClient } from "@tanstack/react-query"
import { fetchAdminBlob, postAdminApi } from "../../admin-api"
import { getStoredAdminToken } from "../../admin-auth"
import { buildMedusaUrl } from "../../admin-config"
import { createApiError } from "../../admin-errors"
import type {
  BulkBusinessStatusResponse,
  ManualOrderBusinessStatusId,
  OrderExpeditionBlockingOrder,
  OrderExpeditionTargetStatus,
} from "../../admin-types"
import { ORDER_EXPEDITION_QUERY_KEYS } from "./query-keys"

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
  if (
    typeof payload === "object" &&
    payload !== null &&
    "blocked_orders" in payload &&
    Array.isArray(payload.blocked_orders)
  ) {
    return payload.blocked_orders.filter(isBlockingOrder)
  }

  return []
}

function getAdminApiPayloadMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message

    if (typeof message === "string") {
      return message
    }
  }

  return fallback
}

export function invalidateOrderExpeditionQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ORDER_EXPEDITION_QUERY_KEYS.businessStatusesByIds,
    }),
    queryClient.invalidateQueries({
      queryKey: ORDER_EXPEDITION_QUERY_KEYS.dashboardCount,
    }),
    queryClient.invalidateQueries({
      queryKey: ORDER_EXPEDITION_QUERY_KEYS.orders,
    }),
  ])
}

export async function downloadOrderExpeditionPdf(orderIds: string[]) {
  const blob = await fetchAdminBlob("/admin/order-expedition/pdf", {
    body: { order_ids: orderIds },
    method: "POST",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `order-expedition-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function updateOrderExpeditionStatus({
  orderIds,
  targetStatus,
}: {
  orderIds: string[]
  targetStatus: OrderExpeditionTargetStatus
}) {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  })
  const token = getStoredAdminToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(
    buildMedusaUrl("/admin/order-expedition/status"),
    {
      body: JSON.stringify({
        order_ids: orderIds,
        target_status: targetStatus,
      }),
      credentials: "include",
      headers,
      method: "POST",
    }
  )
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = getAdminApiPayloadMessage(
      payload,
      "Nepodarilo se zmenit Medusa status."
    )
    const blockedOrders = getBlockingOrders(payload)

    if (blockedOrders.length) {
      return {
        blockedOrders,
        message,
        ok: false as const,
      }
    }

    throw createApiError(message, response.status)
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    payload.ok === false
  ) {
    return {
      blockedOrders: getBlockingOrders(payload),
      message: getAdminApiPayloadMessage(
        payload,
        "Nepodarilo se zmenit Medusa status."
      ),
      ok: false as const,
    }
  }

  return {
    blockedOrders: [],
    ok: true as const,
  }
}

export function updateOrderBusinessStatus({
  orderId,
  status,
}: {
  orderId: string
  status: ManualOrderBusinessStatusId | null
}) {
  return postAdminApi(`/admin/orders/${orderId}/business-status`, { status })
}

export function bulkUpdateOrderBusinessStatus({
  orderIds,
  status,
}: {
  orderIds: string[]
  status: ManualOrderBusinessStatusId | null
}) {
  return postAdminApi<BulkBusinessStatusResponse>(
    "/admin/order-business-statuses/bulk",
    {
      order_ids: orderIds,
      status,
    }
  )
}
