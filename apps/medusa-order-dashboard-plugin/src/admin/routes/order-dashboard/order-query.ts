import type {
  DataTableDateComparisonOperator,
  DataTablePaginationState,
  DataTableSortingState,
} from "@medusajs/ui"
import type { ListOrderDashboardOrdersInput } from "./api"
import {
  ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID,
  ORDER_DASHBOARD_QUEUE_IDS,
  type OrderDashboardCarrierKey,
  type OrderDashboardQueueId,
  type OrderDashboardSortField,
  type OrderDashboardSortOrder,
} from "./types"

export const ORDER_DASHBOARD_QUERY_KEY = "order-dashboard-orders"

export const DEFAULT_ORDER_DASHBOARD_SORTING = {
  desc: true,
  id: "created_at",
} satisfies DataTableSortingState

const DEFAULT_ORDER_DASHBOARD_SORT_ORDER = "-created_at"

const ORDER_DASHBOARD_SORT_FIELD_BY_COLUMN_ID = {
  business_status: "business_status",
  carrier: "carrier",
  created_at: "created_at",
  customer: "customer",
  fulfillment_status: "fulfillment",
  order_display_id: "display_id",
  payment_status: "payment",
  total: "total",
} as const satisfies Record<string, OrderDashboardSortField>

type OrderDashboardOrdersQueryState = {
  carrierFilter: OrderDashboardCarrierKey | "all"
  createdAt?: DataTableDateComparisonOperator | null
  pagination: DataTablePaginationState
  queueId: OrderDashboardQueueId
  search: string
  sorting: DataTableSortingState | null | undefined
}

export function getOrderDashboardOrdersQuery({
  carrierFilter,
  createdAt,
  pagination,
  queueId,
  search,
  sorting,
}: OrderDashboardOrdersQueryState) {
  const request = {
    businessStatus: getBusinessStatusFilter(queueId),
    businessStatusGroup: getBusinessStatusGroupFilter(queueId),
    carrier: carrierFilter === "all" ? undefined : carrierFilter,
    createdAt: createdAt ?? undefined,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    order: getOrderDashboardSortOrder(sorting),
    pendingUnpaid:
      queueId === ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID ? true : undefined,
    q: search.length > 0 ? search : undefined,
  } satisfies ListOrderDashboardOrdersInput

  return {
    queryKey: [ORDER_DASHBOARD_QUERY_KEY, request] as const,
    request,
  }
}

export function isOrderDashboardQueueId(
  value: unknown
): value is OrderDashboardQueueId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_QUEUE_IDS.includes(value as OrderDashboardQueueId)
  )
}

export function getOrderDashboardQueueId(
  value: unknown
): OrderDashboardQueueId {
  if (value === null) {
    return ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID
  }

  return isOrderDashboardQueueId(value) ? value : "all"
}

function getOrderDashboardSortOrder(
  sorting: DataTableSortingState | null | undefined
): OrderDashboardSortOrder {
  if (!sorting) {
    return DEFAULT_ORDER_DASHBOARD_SORT_ORDER
  }

  const field =
    ORDER_DASHBOARD_SORT_FIELD_BY_COLUMN_ID[
      sorting.id as keyof typeof ORDER_DASHBOARD_SORT_FIELD_BY_COLUMN_ID
    ]

  if (!field) {
    return DEFAULT_ORDER_DASHBOARD_SORT_ORDER
  }

  return sorting.desc ? `-${field}` : field
}

function getBusinessStatusFilter(queueId: OrderDashboardQueueId) {
  return queueId === "all" ||
    queueId === "action_required" ||
    queueId === ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID
    ? undefined
    : queueId
}

function getBusinessStatusGroupFilter(queueId: OrderDashboardQueueId) {
  return queueId === "action_required" ? queueId : undefined
}
