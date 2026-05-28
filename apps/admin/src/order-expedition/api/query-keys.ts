import { MEDUSA_BACKEND_URL } from "../../admin-config"
import type { OrderExpeditionCarrierKey } from "../../admin-types"
import type {
  OrderDashboardViewFilter,
  OrderDashboardViewId,
} from "../model/views"
import {
  ORDER_EXPEDITION_DASHBOARD_COUNT_LIMIT,
  ORDER_EXPEDITION_LIST_LIMIT,
} from "./constants"

export type OrderExpeditionDashboardCountView = OrderDashboardViewId

export const ORDER_EXPEDITION_QUERY_KEYS = {
  businessStatusesByIds: ["order-business-statuses-by-ids"] as const,
  carriers: ["order-expedition-carriers", MEDUSA_BACKEND_URL] as const,
  dashboardCount: ["order-expedition-dashboard-count"] as const,
  orders: ["order-expedition-orders"] as const,
}

export function getOrderExpeditionOrdersQueryKey({
  carrier,
  filter,
  offset,
  view,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  filter: OrderDashboardViewFilter
  offset: number
  view: OrderDashboardViewId
}) {
  return [
    ...ORDER_EXPEDITION_QUERY_KEYS.orders,
    MEDUSA_BACKEND_URL,
    {
      carrier,
      filter,
      limit: ORDER_EXPEDITION_LIST_LIMIT,
      offset,
      view,
    },
  ] as const
}

export function getOrderExpeditionDashboardCountQueryKey({
  carrier,
  view,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  view: OrderExpeditionDashboardCountView
}) {
  return [
    ...ORDER_EXPEDITION_QUERY_KEYS.dashboardCount,
    MEDUSA_BACKEND_URL,
    { carrier, limit: ORDER_EXPEDITION_DASHBOARD_COUNT_LIMIT, offset: 0, view },
  ] as const
}

export function getOrderBusinessStatusesByIdsQueryKey(ids: string[]) {
  return [
    ...ORDER_EXPEDITION_QUERY_KEYS.businessStatusesByIds,
    MEDUSA_BACKEND_URL,
    ids,
  ] as const
}
