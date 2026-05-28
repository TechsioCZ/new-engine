import { useQueries, useQuery } from "@tanstack/react-query"
import { fetchAdminApi } from "../../admin-api"
import type {
  OrderBusinessStatusesByIdsResponse,
  OrderBusinessStatusId,
  OrderExpeditionCarrierKey,
  OrderExpeditionCarriersResponse,
  OrderExpeditionOrdersResponse,
} from "../../admin-types"
import {
  getDashboardCountQueryViews,
  getDashboardCountsByView,
  getDashboardViewFilter,
  type OrderDashboardViewFilter,
} from "../model/views"
import { aggregateOrderExpeditionOrdersResponses } from "./aggregate-orders"
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

type OrderExpeditionDashboardCountInput = {
  carrier: OrderExpeditionCarrierKey | "all"
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
  limit,
  offset,
}: {
  businessStatus: OrderBusinessStatusId | "all"
  carrier: OrderExpeditionCarrierKey | "all"
  limit: number
  offset: number
}): Promise<OrderExpeditionOrdersResponse> {
  return fetchAdminApi<OrderExpeditionOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      ...(businessStatus === "all" ? {} : { business_status: businessStatus }),
      ...(carrier === "all" ? {} : { carrier }),
      limit: String(limit),
      offset: String(offset),
    }
  ).then(normalizeOrderExpeditionOrdersResponse)
}

async function fetchOrderExpeditionOrdersForFilter({
  carrier,
  filter,
  limit = ORDER_EXPEDITION_LIST_LIMIT,
  offset,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  filter: OrderDashboardViewFilter
  limit?: number
  offset: number
}): Promise<OrderExpeditionOrdersResponse> {
  if (filter.kind !== "statuses") {
    return fetchOrderExpeditionOrdersFromAdminApi({
      businessStatus: filter.kind === "status" ? filter.status : "all",
      carrier,
      limit,
      offset,
    })
  }

  const aggregateLimit = offset + limit
  const responses = await Promise.all(
    filter.statuses.map((status) =>
      fetchOrderExpeditionOrdersFromAdminApi({
        businessStatus: status,
        carrier,
        limit: aggregateLimit,
        offset: 0,
      })
    )
  )

  return aggregateOrderExpeditionOrdersResponses({
    carrier,
    limit,
    offset,
    responses,
  })
}

async function fetchOrderExpeditionDashboardCountFromAdminApi({
  carrier,
  view,
}: OrderExpeditionDashboardCountInput): Promise<OrderExpeditionDashboardCount> {
  const filter = getDashboardViewFilter(view)
  const response = await fetchOrderExpeditionOrdersForFilter({
    carrier,
    filter,
    limit: ORDER_EXPEDITION_DASHBOARD_COUNT_LIMIT,
    offset: 0,
  })

  return toOrderExpeditionDashboardCount(
    view,
    normalizeOrderExpeditionOrdersResponse(response)
  )
}

function getOrderExpeditionDashboardCountQueryOptions({
  carrier,
  view,
}: OrderExpeditionDashboardCountInput) {
  return {
    queryFn: () =>
      fetchOrderExpeditionDashboardCountFromAdminApi({ carrier, view }),
    queryKey: getOrderExpeditionDashboardCountQueryKey({ carrier, view }),
    staleTime: ORDER_EXPEDITION_STALE_TIME_MS,
  }
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
  carrier,
  filter,
  offset,
  view,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  filter: OrderDashboardViewFilter
  offset: number
  view: OrderExpeditionDashboardCountView
}) {
  return useQuery({
    queryFn: () =>
      fetchOrderExpeditionOrdersForFilter({
        carrier,
        filter,
        offset,
      }),
    queryKey: getOrderExpeditionOrdersQueryKey({
      carrier,
      filter,
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
  const queryViews = getDashboardCountQueryViews(views)

  return useQueries({
    queries: queryViews.map((view) =>
      getOrderExpeditionDashboardCountQueryOptions({ carrier, view })
    ),
  })
}

export function useOrderExpeditionDashboardCount({
  carrier,
  enabled = true,
  view,
}: OrderExpeditionDashboardCountInput & { enabled?: boolean }) {
  const queryViews = getDashboardCountQueryViews([view])
  const countQueries = useQueries({
    queries: queryViews.map((queryView) => ({
      ...getOrderExpeditionDashboardCountQueryOptions({
        carrier,
        view: queryView,
      }),
      enabled,
    })),
  })
  const countsByView = getDashboardCountsByView({
    activeCount: 0,
    activeCountExact: true,
    activeView: view,
    countQueries,
    hasActiveCount: false,
  })
  const count = countsByView.get(view)

  return {
    data: count
      ? {
          count: count.count,
          count_exact: count.countExact,
          view,
        }
      : undefined,
    error: countQueries.find((query) => query.error)?.error,
    isError: countQueries.some((query) => query.isError),
  }
}

export function useOrderBusinessStatusesByIds(ids: string[]) {
  return useQuery({
    enabled: ids.length > 0,
    queryFn: () => fetchOrderBusinessStatusesByIdsFromAdminApi(ids),
    queryKey: getOrderBusinessStatusesByIdsQueryKey(ids),
  })
}
