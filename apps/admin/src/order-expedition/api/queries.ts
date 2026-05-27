import { useQueries, useQuery } from "@tanstack/react-query"
import {
  fetchAdminApi,
  getActionRequiredOrdersQueryOptions,
} from "../../admin-api"
import type {
  ActionRequiredOrdersResponse,
  OrderBusinessStatusesByIdsResponse,
  OrderBusinessStatusId,
  OrderExpeditionCarrierKey,
  OrderExpeditionCarriersResponse,
  OrderExpeditionOrdersResponse,
} from "../../admin-types"
import type { OrderExpeditionQueryView } from "../model/views"
import {
  ORDER_EXPEDITION_DASHBOARD_COUNT_LIMIT,
  ORDER_EXPEDITION_LIST_LIMIT,
  ORDER_EXPEDITION_STALE_TIME_MS,
} from "./constants"
import {
  getOrderBusinessStatusesByIdsQueryKey,
  getOrderExpeditionDashboardCountQueryKey,
  getOrderExpeditionOrdersQueryKey,
  ORDER_EXPEDITION_QUERY_KEYS,
  type OrderExpeditionDashboardCountView,
} from "./query-keys"

export type OrderExpeditionDashboardCount = {
  count: number
  count_exact: boolean
  view: OrderExpeditionDashboardCountView
}

export function normalizeOrderExpeditionOrdersResponse(
  response: OrderExpeditionOrdersResponse
): OrderExpeditionOrdersResponse {
  const loadedCount = response.offset + response.orders.length
  const count = Math.max(response.count, loadedCount)
  const countExact =
    response.count_exact &&
    (response.count >= loadedCount || !response.has_next)

  return {
    ...response,
    count,
    count_exact: countExact,
  }
}

function getOrderExpeditionCountBusinessStatus(
  view: OrderExpeditionDashboardCountView
): OrderBusinessStatusId | "all" {
  if (view === "all") {
    return "all"
  }

  if (view === "action-required") {
    return "awaiting_payment"
  }

  return view
}

function toOrderExpeditionDashboardCount(
  view: OrderExpeditionDashboardCountView,
  response: {
    count: number
    count_exact: boolean
  }
): OrderExpeditionDashboardCount {
  return {
    count: response.count,
    count_exact: response.count_exact,
    view,
  }
}

function fetchOrderExpeditionCarriersFromAdminApi(): Promise<OrderExpeditionCarriersResponse> {
  return fetchAdminApi<OrderExpeditionCarriersResponse>(
    "/admin/order-expedition/carriers"
  )
}

function fetchOrderExpeditionOrdersFromAdminApi({
  businessStatus,
  carrier,
  offset,
}: {
  businessStatus: OrderBusinessStatusId | "all"
  carrier: OrderExpeditionCarrierKey | "all"
  offset: number
  view: OrderExpeditionQueryView
}): Promise<OrderExpeditionOrdersResponse> {
  return fetchAdminApi<OrderExpeditionOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      ...(businessStatus === "all" ? {} : { business_status: businessStatus }),
      ...(carrier === "all" ? {} : { carrier }),
      limit: String(ORDER_EXPEDITION_LIST_LIMIT),
      offset: String(offset),
    }
  ).then(normalizeOrderExpeditionOrdersResponse)
}

async function fetchOrderExpeditionDashboardCountFromAdminApi({
  carrier,
  view,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  view: OrderExpeditionDashboardCountView
}): Promise<OrderExpeditionDashboardCount> {
  const businessStatus = getOrderExpeditionCountBusinessStatus(view)
  const response = await fetchAdminApi<OrderExpeditionOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      ...(businessStatus === "all" ? {} : { business_status: businessStatus }),
      ...(carrier === "all" ? {} : { carrier }),
      limit: String(ORDER_EXPEDITION_DASHBOARD_COUNT_LIMIT),
      offset: "0",
    }
  )

  return toOrderExpeditionDashboardCount(
    view,
    normalizeOrderExpeditionOrdersResponse(response)
  )
}

function fetchOrderBusinessStatusesByIdsFromAdminApi(
  ids: string[]
): Promise<OrderBusinessStatusesByIdsResponse> {
  return fetchAdminApi<OrderBusinessStatusesByIdsResponse>(
    "/admin/order-business-statuses/by-ids",
    {
      ids: ids.join(","),
    }
  )
}

export function useOrderExpeditionCarriers() {
  return useQuery({
    queryFn: fetchOrderExpeditionCarriersFromAdminApi,
    queryKey: ORDER_EXPEDITION_QUERY_KEYS.carriers,
  })
}

export function useOrderExpeditionOrders({
  businessStatus,
  carrier,
  offset,
  view,
}: {
  businessStatus: OrderBusinessStatusId | "all"
  carrier: OrderExpeditionCarrierKey | "all"
  offset: number
  view: OrderExpeditionQueryView
}) {
  return useQuery({
    queryFn: () =>
      fetchOrderExpeditionOrdersFromAdminApi({
        businessStatus,
        carrier,
        offset,
        view,
      }),
    queryKey: getOrderExpeditionOrdersQueryKey({
      businessStatus,
      carrier,
      offset,
      view,
    }),
  })
}

export function useOrderExpeditionDashboardCounts({
  carrier,
  views,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  views: OrderExpeditionDashboardCountView[]
}) {
  return useQueries({
    queries: views.map((view) => {
      if (view === "action-required" && carrier === "all") {
        return {
          ...getActionRequiredOrdersQueryOptions(),
          select: (response: ActionRequiredOrdersResponse) =>
            toOrderExpeditionDashboardCount(view, response),
        }
      }

      return {
        queryFn: () =>
          fetchOrderExpeditionDashboardCountFromAdminApi({ carrier, view }),
        queryKey: getOrderExpeditionDashboardCountQueryKey({ carrier, view }),
        staleTime: ORDER_EXPEDITION_STALE_TIME_MS,
      }
    }),
  })
}

export function useOrderBusinessStatusesByIds(ids: string[]) {
  return useQuery({
    enabled: ids.length > 0,
    queryFn: () => fetchOrderBusinessStatusesByIdsFromAdminApi(ids),
    queryKey: getOrderBusinessStatusesByIdsQueryKey(ids),
  })
}
