import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { useEffect, useState } from "react"
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom"
import { useActionRequiredSummary } from "./admin-api"
import { clearStoredAdminToken, hasStoredAdminToken } from "./admin-auth"
import { isAuthError } from "./admin-errors"
import { LoginPage } from "./admin-login-page"
import { CustomersPage, OrdersPage } from "./admin-pages"
import type { BadgeKey } from "./admin-types"
import { type AdminNavItem, adminNavItems } from "./nav-config"

export function AdminApp() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredAdminToken)
  const isLoginRoute = location.pathname === "/login"
  const summary = useActionRequiredSummary({
    enabled: isAuthenticated && !isLoginRoute,
  })

  useEffect(() => {
    if (summary.isError && isAuthError(summary.error)) {
      clearStoredAdminToken()
      setIsAuthenticated(false)
    }
  }, [summary.error, summary.isError])

  async function handleAuthenticated() {
    setIsAuthenticated(true)
    await queryClient.invalidateQueries()
  }

  function handleLogout() {
    clearStoredAdminToken()
    setIsAuthenticated(false)
    queryClient.clear()
  }

  if (isLoginRoute) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return (
    <div className="admin-shell">
      <Sidebar onLogout={handleLogout} summary={summary.data} />
      <main className="admin-main">
        {summary.isError && isAuthError(summary.error) ? (
          <Navigate replace to="/login" />
        ) : (
          <Routes>
            <Route
              element={<Navigate replace to="/orders?view=action-required" />}
              path="/"
            />
            <Route element={<OrdersPage />} path="/orders" />
            <Route element={<CustomersPage />} path="/customers" />
            <Route
              element={<Navigate replace to="/orders?view=action-required" />}
              path="*"
            />
          </Routes>
        )}
      </main>
    </div>
  )
}

type SummaryCounts = {
  customers?: {
    count?: number
  }
  orders?: {
    count?: number
  }
}

function Sidebar({
  onLogout,
  summary,
}: {
  onLogout: () => void
  summary: SummaryCounts | undefined
}) {
  return (
    <aside aria-label="Admin navigation" className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-brand-mark">NE</span>
        <span>
          <strong>New Engine</strong>
          <small>Admin</small>
        </span>
      </div>
      <nav className="admin-nav">
        {adminNavItems.map((item) => (
          <SidebarItem item={item} key={item.href} summary={summary} />
        ))}
      </nav>
      <button className="admin-sidebar-action" onClick={onLogout} type="button">
        Odhlasit
      </button>
    </aside>
  )
}

function SidebarItem({
  item,
  summary,
}: {
  item: AdminNavItem
  summary: SummaryCounts | undefined
}) {
  const location = useLocation()
  const badgeCount = getBadgeCount(item.badgeKey, summary)
  const isActive = location.pathname.startsWith(item.activeMatch)

  return (
    <NavLink
      className={({ isPending }) =>
        [
          "admin-nav-item",
          isActive ? "is-active" : "",
          isPending ? "is-pending" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      to={item.href}
    >
      <span className="admin-nav-icon">{item.icon}</span>
      <span className="admin-nav-label">{item.label}</span>
      {badgeCount > 0 && (
        <Badge className="admin-count-badge" size="sm" variant="danger">
          {String(badgeCount)}
        </Badge>
      )}
    </NavLink>
  )
}

function getBadgeCount(
  badgeKey: BadgeKey | undefined,
  summary: SummaryCounts | undefined
) {
  if (badgeKey === "ordersActionRequired") {
    return summary?.orders?.count ?? 0
  }

  if (badgeKey === "customersActionRequired") {
    return summary?.customers?.count ?? 0
  }

  return 0
}
