import type {
  OrderBusinessStatusId,
  OrderExpeditionCarrierKey,
} from "../../admin-types"
import { isOrderBusinessStatusId, ORDER_BUSINESS_STATUS_IDS } from "./statuses"

export const ALL_CARRIERS = "all"

export const ORDER_DASHBOARD_VIEW_IDS = [
  "all",
  "action-required",
  ...ORDER_BUSINESS_STATUS_IDS,
] as const

export const ORDER_UNRESOLVED_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
] as const satisfies readonly OrderBusinessStatusId[]

export type OrderDashboardViewId = (typeof ORDER_DASHBOARD_VIEW_IDS)[number]

export type OrderDashboardViewFilter =
  | {
      kind: "all"
    }
  | {
      kind: "status"
      status: OrderBusinessStatusId
    }
  | {
      kind: "statuses"
      statuses: readonly OrderBusinessStatusId[]
    }

export const ORDER_DASHBOARD_VIEW_ITEMS: Array<{
  label: string
  value: OrderDashboardViewId
}> = [
  { label: "Vsechny objednavky", value: "all" },
  { label: "Nevyrizene", value: "action-required" },
  { label: "Nove", value: "new" },
  { label: "Cekajici na platbu", value: "awaiting_payment" },
  { label: "Prijata platba", value: "paid" },
  { label: "Vyrizuje se", value: "processing" },
  { label: "Cekame - interni", value: "waiting_for_supplier" },
  { label: "Vyrizena", value: "shipped" },
  { label: "Dorucena", value: "delivered" },
  { label: "Storno", value: "canceled" },
]

export type DashboardTabCount = {
  count: number
  countExact: boolean
}

type DashboardCountQueryResult = {
  data?: {
    count: number
    count_exact: boolean
    view: OrderDashboardViewId
  }
}

export function isOrderDashboardViewId(
  value: unknown
): value is OrderDashboardViewId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_VIEW_IDS.some((view) => view === value)
  )
}

export function isOrderExpeditionCarrierKey(
  value: unknown
): value is OrderExpeditionCarrierKey {
  return value === "ppl" || value === "packeta" || value === "other"
}

export function readOrderDashboardView(
  value: string | null
): OrderDashboardViewId {
  return isOrderDashboardViewId(value) ? value : "all"
}

export function readOrderExpeditionCarrier(
  value: string | null
): OrderExpeditionCarrierKey | "all" {
  return isOrderExpeditionCarrierKey(value) ? value : ALL_CARRIERS
}

export function getDashboardViewFilter(
  view: OrderDashboardViewId
): OrderDashboardViewFilter {
  if (view === "action-required") {
    return {
      kind: "statuses",
      statuses: ORDER_UNRESOLVED_STATUS_IDS,
    }
  }

  if (isOrderBusinessStatusId(view)) {
    return {
      kind: "status",
      status: view,
    }
  }

  return {
    kind: "all",
  }
}

export function getDashboardCountQueryViews(
  views: readonly OrderDashboardViewId[]
) {
  const queryViews = new Set<OrderDashboardViewId>()

  for (const view of views) {
    const filter = getDashboardViewFilter(view)

    if (filter.kind === "statuses") {
      for (const status of filter.statuses) {
        queryViews.add(status)
      }
    } else {
      queryViews.add(view)
    }
  }

  return [...queryViews]
}

function getAggregateDashboardTabCount(
  counts: Map<OrderDashboardViewId, DashboardTabCount>,
  statuses: readonly OrderBusinessStatusId[]
) {
  let count = 0
  let countExact = true

  for (const status of statuses) {
    const statusCount = counts.get(status)

    if (!statusCount) {
      return
    }

    count += statusCount.count
    countExact = countExact && statusCount.countExact
  }

  return {
    count,
    countExact,
  }
}

export function getOffsetSearchParams(
  searchParams: URLSearchParams,
  nextOffset: number
) {
  const params = new URLSearchParams(searchParams)

  if (nextOffset > 0) {
    params.set("offset", String(nextOffset))
  } else {
    params.delete("offset")
  }

  return params
}

export function getListSearchParams(
  searchParams: URLSearchParams,
  {
    carrier,
    view,
  }: {
    carrier?: OrderExpeditionCarrierKey | "all"
    view?: OrderDashboardViewId
  }
) {
  const params = new URLSearchParams(searchParams)

  if (view) {
    if (view === "all") {
      params.delete("view")
    } else {
      params.set("view", view)
    }
  }

  if (carrier) {
    if (carrier === ALL_CARRIERS) {
      params.delete("carrier")
    } else {
      params.set("carrier", carrier)
    }
  }

  params.delete("offset")

  return params
}

export function getDashboardCountsByView({
  activeCount,
  activeCountExact,
  activeView,
  countQueries,
  hasActiveCount,
}: {
  activeCount: number
  activeCountExact: boolean
  activeView: OrderDashboardViewId
  countQueries: DashboardCountQueryResult[]
  hasActiveCount: boolean
}) {
  const counts = new Map<OrderDashboardViewId, DashboardTabCount>()

  for (const query of countQueries) {
    const count = query.data

    if (count) {
      counts.set(count.view, {
        count: count.count,
        countExact: count.count_exact,
      })
    }
  }

  const unresolvedCount = getAggregateDashboardTabCount(
    counts,
    ORDER_UNRESOLVED_STATUS_IDS
  )

  if (unresolvedCount) {
    counts.set("action-required", unresolvedCount)
  }

  const activeTabCount = counts.get(activeView)

  if (
    hasActiveCount &&
    (!activeTabCount ||
      activeCount > activeTabCount.count ||
      (activeCount === activeTabCount.count &&
        activeCountExact &&
        !activeTabCount.countExact))
  ) {
    counts.set(activeView, {
      count: activeCount,
      countExact: activeCountExact,
    })
  }

  return counts
}
