import type {
  OrderBusinessStatusId,
  OrderExpeditionCarrierKey,
} from "../../admin-types"
import { isOrderBusinessStatusId, ORDER_BUSINESS_STATUS_IDS } from "./statuses"

export const ALL_CARRIERS = "all"
export const ALL_BUSINESS_STATUSES = "all"

export const ORDER_DASHBOARD_VIEW_IDS = [
  "all",
  "action-required",
  ...ORDER_BUSINESS_STATUS_IDS,
] as const

export type OrderDashboardViewId = (typeof ORDER_DASHBOARD_VIEW_IDS)[number]
export type OrderExpeditionQueryView = "all" | "action-required"

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

export function getBusinessStatusForDashboardView(
  view: OrderDashboardViewId
): OrderBusinessStatusId | "all" {
  if (view === "action-required") {
    return "awaiting_payment"
  }

  return isOrderBusinessStatusId(view) ? view : ALL_BUSINESS_STATUSES
}

export function getExpeditionViewForDashboardView(
  view: OrderDashboardViewId
): OrderExpeditionQueryView {
  return view === "action-required" ? view : "all"
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
