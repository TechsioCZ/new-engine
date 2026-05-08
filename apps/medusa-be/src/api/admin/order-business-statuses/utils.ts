import type { Query } from "@medusajs/framework/types"
import {
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

  return (data as OrderBusinessStatusOrder[])[0]
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
    total: order.total,
  }
}

export function buildOrderBusinessStatusMetadata(
  metadata: Record<string, unknown> | null | undefined,
  status: ManualOrderBusinessStatusId | null
) {
  const nextMetadata = { ...(metadata ?? {}) }

  if (status === null) {
    delete nextMetadata[ORDER_BUSINESS_STATUS_METADATA_KEY]
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
