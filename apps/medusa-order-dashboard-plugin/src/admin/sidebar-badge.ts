import { sdk } from "./lib/sdk"
import type { OrderDashboardSummaryResponse } from "./routes/order-dashboard/types"

const ORDER_DASHBOARD_SIDEBAR_BADGE_ID = "order-dashboard-sidebar-badge"
const ORDER_DASHBOARD_SIDEBAR_LINK_SELECTOR =
  'a[href$="/order-dashboard"], a[href$="/order-dashboard/"]'
const ORDER_DASHBOARD_SIDEBAR_BADGE_REFRESH_MS = 60_000

let currentCount: number | null = null
let refreshInFlight = false
let started = false

export function startOrderDashboardSidebarBadge() {
  if (
    started ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return
  }

  started = true

  const render = () => {
    if (currentCount === null && getOrderDashboardSidebarLink()) {
      void refreshOrderDashboardSidebarBadge()
    }

    renderOrderDashboardSidebarBadge(currentCount)
  }

  render()

  const observer = new MutationObserver(render)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  window.setInterval(
    () => void refreshOrderDashboardSidebarBadge(),
    ORDER_DASHBOARD_SIDEBAR_BADGE_REFRESH_MS
  )
  window.addEventListener(
    "focus",
    () => void refreshOrderDashboardSidebarBadge()
  )
}

export function setOrderDashboardSidebarBadgeCount(count: number | null) {
  currentCount = count
  renderOrderDashboardSidebarBadge(currentCount)
}

async function refreshOrderDashboardSidebarBadge() {
  if (refreshInFlight) {
    return
  }

  refreshInFlight = true

  try {
    const summary = await sdk.client.fetch<OrderDashboardSummaryResponse>(
      "/admin/order-expedition/summary"
    )
    setOrderDashboardSidebarBadgeCount(summary.action_required_count)
  } catch {
    setOrderDashboardSidebarBadgeCount(null)
  } finally {
    refreshInFlight = false
  }
}

function renderOrderDashboardSidebarBadge(count: number | null) {
  if (typeof document === "undefined") {
    return
  }

  const link = getOrderDashboardSidebarLink()

  if (!link || count === null || count <= 0) {
    removeOrderDashboardSidebarBadge()
    return
  }

  let badge = document.getElementById(ORDER_DASHBOARD_SIDEBAR_BADGE_ID)

  if (!badge) {
    badge = document.createElement("span")
    badge.id = ORDER_DASHBOARD_SIDEBAR_BADGE_ID
    badge.style.alignItems = "center"
    badge.style.background = "rgb(122 40 46)"
    badge.style.border = "1px solid rgb(180 83 91)"
    badge.style.borderRadius = "9999px"
    badge.style.color = "white"
    badge.style.display = "inline-flex"
    badge.style.fontSize = "11px"
    badge.style.fontWeight = "600"
    badge.style.height = "20px"
    badge.style.justifyContent = "center"
    badge.style.lineHeight = "20px"
    badge.style.marginLeft = "auto"
    badge.style.minWidth = "20px"
    badge.style.padding = "0 6px"
    badge.style.pointerEvents = "none"
    badge.style.whiteSpace = "nowrap"
    link.appendChild(badge)
  }

  const countText = String(count)
  const label = `${count} action required orders`

  if (badge.textContent !== countText) {
    badge.textContent = countText
  }

  if (badge.getAttribute("aria-label") !== label) {
    badge.setAttribute("aria-label", label)
  }

  if (badge.title !== label) {
    badge.title = label
  }
}

function removeOrderDashboardSidebarBadge() {
  document.getElementById(ORDER_DASHBOARD_SIDEBAR_BADGE_ID)?.remove()
}

function getOrderDashboardSidebarLink() {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      ORDER_DASHBOARD_SIDEBAR_LINK_SELECTOR
    )
  )

  return (
    links.find((link) => link.textContent?.includes("Order dashboard")) ??
    links[0] ??
    null
  )
}
