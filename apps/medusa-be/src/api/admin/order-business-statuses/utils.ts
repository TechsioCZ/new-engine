import type { Query } from "@medusajs/framework/types"
import {
  getManualOrderBusinessStatusId,
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
  type OrderBusinessStatusInput,
  type OrderBusinessStatusSummary,
  resolveOrderBusinessStatus,
} from "../../../utils/order-business-status"

export type OrderBusinessStatusOrder = OrderBusinessStatusInput & {
  created_at?: Date | string | null
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | null
  email?: string | null
  id: string
  metadata?: Record<string, unknown> | null
  total?: number | string | null
}

export const ORDER_BUSINESS_STATUS_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "status",
  "metadata",
  "payment_status",
  "payment_collections.status",
  "fulfillment_status",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
]

export async function fetchOrderBusinessStatusOrder(query: Query, id: string) {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: { id },
  })

  return parseOrderBusinessStatusOrders(data)[0]
}

export function parseOrderBusinessStatusOrders(
  value: unknown
): OrderBusinessStatusOrder[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected order business status query to return an array")
  }

  return value.map((order, index) => {
    if (!isOrderBusinessStatusOrder(order)) {
      throw new Error(
        `Expected order business status query result at index ${index} to include a string id`
      )
    }

    return order
  })
}

function isOrderBusinessStatusOrder(
  value: unknown
): value is OrderBusinessStatusOrder {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  )
}

export function toOrderBusinessStatusSummary(
  order: OrderBusinessStatusOrder
): OrderBusinessStatusSummary {
  return {
    business_status: resolveOrderBusinessStatus(order),
    created_at: normalizeDate(order.created_at),
    currency_code: order.currency_code,
    custom_display_id: order.custom_display_id,
    display_id: order.display_id,
    email: order.email,
    id: order.id,
    manual_status: getManualOrderBusinessStatusId(order) ?? null,
    total: order.total,
  }
}

export function buildOrderBusinessStatusMetadata(
  metadata: Record<string, unknown> | null | undefined,
  status: ManualOrderBusinessStatusId | null
) {
  const nextMetadata = { ...(metadata ?? {}) }

  if (status === null) {
    nextMetadata[ORDER_BUSINESS_STATUS_METADATA_KEY] = null
  } else {
    nextMetadata[ORDER_BUSINESS_STATUS_METADATA_KEY] = status
  }

  return nextMetadata
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value ?? null
}
