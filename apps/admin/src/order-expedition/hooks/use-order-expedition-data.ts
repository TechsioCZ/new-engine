import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useMemo } from "react"
import type { OrderExpeditionCarrierKey } from "../../admin-types"
import { ORDER_EXPEDITION_LIST_LIMIT } from "../api/constants"
import {
  useOrderBusinessStatusesByIds,
  useOrderExpeditionCarriers,
  useOrderExpeditionDashboardCounts,
  useOrderExpeditionOrders,
} from "../api/queries"
import {
  formatLimitedNotice,
  getErrorMessage,
  mergeBusinessStatusSummary,
} from "../model/orders"
import {
  ALL_CARRIERS,
  getDashboardCountsByView,
  getDashboardViewFilter,
  ORDER_DASHBOARD_VIEW_ITEMS,
  type OrderDashboardViewId,
} from "../model/views"

export function useOrderExpeditionData({
  carrier,
  dashboardView,
  offset,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  dashboardView: OrderDashboardViewId
  offset: number
}) {
  const carriersQuery = useOrderExpeditionCarriers()
  const dashboardViewFilter = useMemo(
    () => getDashboardViewFilter(dashboardView),
    [dashboardView]
  )
  const ordersQuery = useOrderExpeditionOrders({
    carrier,
    filter: dashboardViewFilter,
    offset,
    view: dashboardView,
  })
  const dashboardCountQueries = useOrderExpeditionDashboardCounts({
    carrier,
    views: ORDER_DASHBOARD_VIEW_ITEMS.map((item) => item.value),
  })
  const rawOrders = useMemo(
    () => ordersQuery.data?.orders ?? [],
    [ordersQuery.data?.orders]
  )
  const rawOrderIds = useMemo(
    () => rawOrders.map((order) => order.id),
    [rawOrders]
  )
  const businessStatusesQuery = useOrderBusinessStatusesByIds(rawOrderIds)
  const businessStatusesById = useMemo(
    () =>
      new Map(
        (businessStatusesQuery.data?.orders ?? []).map((order) => [
          order.id,
          order,
        ])
      ),
    [businessStatusesQuery.data?.orders]
  )
  const orders = useMemo(
    () =>
      rawOrders.map((order) =>
        mergeBusinessStatusSummary(order, businessStatusesById.get(order.id))
      ),
    [businessStatusesById, rawOrders]
  )
  const pageIndex = Math.floor(offset / ORDER_EXPEDITION_LIST_LIMIT)
  const count = ordersQuery.data?.count ?? 0
  const countExact = ordersQuery.data?.count_exact ?? true
  const dashboardCountsByView = getDashboardCountsByView({
    activeCount: count,
    activeCountExact: countExact,
    activeView: dashboardView,
    countQueries: dashboardCountQueries,
    hasActiveCount: Boolean(ordersQuery.data),
  })
  const canPreviousPage = offset > 0
  const canNextPage =
    ordersQuery.data?.has_next ?? offset + ORDER_EXPEDITION_LIST_LIMIT < count
  const notice = ordersQuery.data
    ? formatLimitedNotice({
        carrierFilterLimitReached:
          ordersQuery.data.carrier_filter_limit_reached,
        countExact: ordersQuery.data.count_exact,
        hasNext: ordersQuery.data.has_next,
        limit: ordersQuery.data.limit,
        scannedCount: ordersQuery.data.scanned_count,
      })
    : null
  const orderErrorMessage =
    getErrorMessage(ordersQuery.error) ??
    getErrorMessage(businessStatusesQuery.error)
  const carrierItems: SelectItem[] = [
    {
      displayValue: "Vsichni dopravci",
      label: "Vsichni dopravci",
      value: ALL_CARRIERS,
    },
    ...(carriersQuery.data?.carriers ?? []).map((option) => ({
      displayValue: option.label,
      label: option.label,
      value: option.value,
    })),
  ]

  return {
    canNextPage,
    canPreviousPage,
    carrierItems,
    count,
    countExact,
    dashboardCountsByView,
    notice,
    orderErrorMessage,
    orders,
    ordersQuery,
    pageIndex,
    businessStatusesQuery,
  }
}
