import {
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
  ORDER_DASHBOARD_CARRIER_KEYS,
  ORDER_DASHBOARD_TARGET_STATUSES,
  type OrderDashboardBusinessStatusId,
  type OrderDashboardCarrierKey,
  type OrderDashboardOrder,
  type OrderDashboardTargetStatus,
} from "./types"

type SortingState = {
  id: string
  desc: boolean
}

export function formatLocaleCode(language?: string) {
  return language ? language.replace("_", "-") : undefined
}

export function formatOrderDate(
  date: string | null | undefined,
  locale?: string
) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatOrderTotal(order: OrderDashboardOrder, locale?: string) {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (!(order.currency_code && Number.isFinite(total))) {
    return String(order.total)
  }

  return new Intl.NumberFormat(locale, {
    currency: order.currency_code.toUpperCase(),
    style: "currency",
  }).format(total)
}

export function getCarrierLabel(order: OrderDashboardOrder) {
  return order.carrier.shipping_method_name ?? order.carrier.label
}

export function getOrderItemsSummary(order: OrderDashboardOrder) {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku ?? item.title}`)
    .join(", ")
}

export function getSelectedOrders(
  orders: OrderDashboardOrder[],
  rowSelection: Record<string, boolean>
) {
  return orders.filter((order) => rowSelection[order.id])
}

export function isOrderDashboardCarrierKey(
  value: unknown
): value is OrderDashboardCarrierKey {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_CARRIER_KEYS.includes(value as OrderDashboardCarrierKey)
  )
}

export function isOrderDashboardBusinessStatusId(
  value: unknown
): value is OrderDashboardBusinessStatusId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_BUSINESS_STATUS_IDS.includes(
      value as OrderDashboardBusinessStatusId
    )
  )
}

export function isOrderDashboardTargetStatus(
  value: unknown
): value is OrderDashboardTargetStatus {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_TARGET_STATUSES.includes(
      value as OrderDashboardTargetStatus
    )
  )
}

export function sortOrdersByTableState(
  orders: OrderDashboardOrder[],
  sorting: SortingState | null
) {
  if (!sorting) {
    return orders
  }

  const direction = sorting.desc ? -1 : 1

  return [...orders].sort((left, right) => {
    switch (sorting.id) {
      case "created_at":
        return (
          compareNullableNumbers(
            Date.parse(left.created_at ?? ""),
            Date.parse(right.created_at ?? "")
          ) * direction
        )
      case "order_display_id":
        return (
          left.order_display_id.localeCompare(right.order_display_id) *
          direction
        )
      case "total":
        return (
          compareNullableNumbers(toNumber(left.total), toNumber(right.total)) *
          direction
        )
      default:
        return 0
    }
  })
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return Number.NaN
  }

  return typeof value === "string" ? Number(value) : value
}

function compareNullableNumbers(left: number, right: number) {
  const leftValid = Number.isFinite(left)
  const rightValid = Number.isFinite(right)

  if (!(leftValid || rightValid)) {
    return 0
  }

  if (!leftValid) {
    return 1
  }

  if (!rightValid) {
    return -1
  }

  return left - right
}
