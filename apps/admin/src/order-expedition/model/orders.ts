import type {
  OrderBusinessStatusSummary,
  OrderExpeditionIndicators,
  OrderExpeditionOrder,
} from "../../admin-types"

export const ORDER_EXPEDITION_MAX_ORDER_IDS = 1000

export function mergeBusinessStatusSummary(
  order: OrderExpeditionOrder,
  summary: OrderBusinessStatusSummary | undefined
): OrderExpeditionOrder {
  if (!summary) {
    return order
  }

  return {
    ...order,
    business_status: summary.business_status,
    created_at: summary.created_at,
    currency_code: summary.currency_code,
    manual_status: summary.manual_status,
    total: summary.total,
  }
}

export function getOrderItemsSummary(order: OrderExpeditionOrder) {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku ?? item.title}`)
    .join(", ")
}

export function getCarrierLabel(order: OrderExpeditionOrder) {
  return order.carrier.shipping_method_name ?? order.carrier.label
}

export function getNextPageSelection(
  prev: Map<string, OrderExpeditionOrder>,
  orders: OrderExpeditionOrder[],
  allPageOrdersSelected: boolean
) {
  const next = new Map(prev)

  if (allPageOrdersSelected) {
    for (const order of orders) {
      next.delete(order.id)
    }

    return next
  }

  for (const order of orders) {
    if (!next.has(order.id) && next.size >= ORDER_EXPEDITION_MAX_ORDER_IDS) {
      continue
    }

    next.set(order.id, order)
  }

  return next
}

export function shouldWarnPageSelectionLimit(
  allPageOrdersSelected: boolean,
  orders: OrderExpeditionOrder[],
  selectedOrderIds: Set<string>,
  selectedCount: number
) {
  if (allPageOrdersSelected) {
    return false
  }

  const remainingSlots = ORDER_EXPEDITION_MAX_ORDER_IDS - selectedCount
  const unselectedPageOrderIds = orders
    .map((order) => order.id)
    .filter((orderId) => !selectedOrderIds.has(orderId))

  return unselectedPageOrderIds.length > remainingSlots
}

export function isOrderSelectionLimitBlocked(
  orderId: string,
  selectedOrderIds: Set<string>,
  selectedCount: number
) {
  return (
    !selectedOrderIds.has(orderId) &&
    selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS
  )
}

export function formatLimitedNotice({
  carrierFilterLimitReached,
  countExact,
  hasNext,
  limit,
  scannedCount,
}: {
  carrierFilterLimitReached: boolean
  countExact: boolean
  hasNext: boolean
  limit: number
  scannedCount: number | null
}) {
  if (!countExact) {
    return carrierFilterLimitReached && scannedCount !== null
      ? `Filtr dopravce proskenoval prvnich ${scannedCount} objednavek. Dalsi shody mohou existovat.`
      : "Pocet neni presny; dalsi objednavky mohou byt mimo nacteny rozsah."
  }

  return hasNext ? `Zobrazuje se prvnich ${limit} objednavek.` : null
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined
}

export function getOrderIndicators(
  order: OrderExpeditionOrder
): OrderExpeditionIndicators {
  return (
    order.indicators ?? {
      canceled:
        order.status === "canceled" || order.business_status.id === "canceled",
      has_note: false,
      returning_customer: false,
      wholesale: false,
    }
  )
}
