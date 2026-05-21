import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Fragment, useEffect, useState } from "react"
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom"
import { useActionRequiredSummary } from "./admin-api"
import { clearStoredAdminToken, hasStoredAdminToken } from "./admin-auth"
import { isAuthError } from "./admin-errors"
import { LoginPage } from "./admin-login-page"
import { OrderDetailPage } from "./admin-order-detail-page"
import { PacketaLabelsPage } from "./admin-packeta-labels-page"
import { PacketaSettingsPage } from "./admin-packeta-settings-page"
import {
  CustomersPage,
  EmailsPage,
  OrdersPage,
  PlaceholderPage,
  ProductsPage,
} from "./admin-pages"
import { PayloadSettingsPage } from "./admin-payload-settings-page"
import { PplSettingsPage } from "./admin-ppl-settings-page"
import { ProductDetailPage } from "./admin-product-detail-page"
import { QrPaymentsSettingsPage, SettingsPage } from "./admin-settings-page"
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
            <Route element={<OrderDetailPage />} path="/orders/:id" />
            <Route
              element={
                <PlaceholderPage
                  eyebrow="Objednavky"
                  title="Draft objednavky"
                />
              }
              path="/drafts"
            />
            <Route element={<ProductsPage />} path="/products" />
            <Route element={<ProductDetailPage />} path="/products/:id" />
            <Route
              element={
                <PlaceholderPage eyebrow="Sklad" title="Skladove workflow" />
              }
              path="/inventory"
            />
            <Route element={<CustomersPage />} path="/customers" />
            <Route
              element={
                <PlaceholderPage eyebrow="Promoce" title="Promocni workflow" />
              }
              path="/promotions"
            />
            <Route
              element={
                <PlaceholderPage eyebrow="Ceniky" title="Cenikove workflow" />
              }
              path="/price-lists"
            />
            <Route
              element={<PlaceholderPage eyebrow="Content" title="Content" />}
              path="/content"
            />
            <Route
              element={
                <PlaceholderPage
                  eyebrow="Image Gallery"
                  title="Image Gallery"
                />
              }
              path="/image-gallery"
            />
            <Route element={<EmailsPage />} path="/emails" />
            <Route
              element={
                <PlaceholderPage eyebrow="Producers" title="Producers" />
              }
              path="/producers"
            />
            <Route element={<PacketaLabelsPage />} path="/packeta-labels" />
            <Route
              element={
                <PlaceholderPage
                  eyebrow="Objednavky"
                  title="Order Operations"
                />
              }
              path="/order-operations"
            />
            <Route element={<SettingsPage />} path="/settings" />
            <Route
              element={<QrPaymentsSettingsPage />}
              path="/settings/qr-payments"
            />
            <Route element={<PacketaSettingsPage />} path="/settings/packeta" />
            <Route element={<PplSettingsPage />} path="/settings/ppl" />
            <Route element={<PayloadSettingsPage />} path="/settings/payload" />
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
  let currentSection: string | undefined

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
        {adminNavItems.map((item) => {
          const shouldRenderSection = item.section !== currentSection
          currentSection = item.section

          return (
            <Fragment key={item.href}>
              {shouldRenderSection && item.section && (
                <span className="admin-nav-section">{item.section}</span>
              )}
              <SidebarItem item={item} summary={summary} />
            </Fragment>
          )
        })}
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
