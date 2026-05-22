import {
  BuildingStorefront,
  EllipsisHorizontal,
  OpenRectArrowOut,
} from "@medusajs/icons"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { Fragment, useEffect, useState } from "react"
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { useActionRequiredSummary, useAdminStoreSummary } from "./admin-api"
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
import { StoreSettingsPage } from "./admin-store-settings-page"
import type {
  ActionRequiredSummary,
  AdminStoreSummary,
  BadgeKey,
} from "./admin-types"
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

  if (isAuthenticated && isLoginRoute) {
    return <Navigate replace to="/orders?view=action-required" />
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
            <Route element={<StoreSettingsPage />} path="/settings/store" />
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

function Sidebar({
  onLogout,
  summary,
}: {
  onLogout: () => void
  summary: ActionRequiredSummary | undefined
}) {
  const store = useAdminStoreSummary()
  let currentSection: string | undefined

  return (
    <aside aria-label="Admin navigation" className="admin-sidebar">
      <AccountMenu onLogout={onLogout} store={store.data} />
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
    </aside>
  )
}

function AccountMenu({
  onLogout,
  store,
}: {
  onLogout: () => void
  store: AdminStoreSummary | null | undefined
}) {
  const [open, setOpen] = useState(false)
  const storeName = store?.name || "New Engine"
  const fallback = getStoreFallback(storeName)

  function handleLogout() {
    setOpen(false)
    onLogout()
  }

  return (
    <Popover.Root
      id="admin-account-menu"
      onOpenChange={(details) => setOpen(details.open)}
      open={open}
      placement="bottom-start"
      sameWidth
    >
      <Popover.Trigger
        className="admin-account-menu-trigger"
        size="current"
        theme="unstyled"
      >
        <span className="admin-brand-mark">{fallback}</span>
        <span className="admin-account-menu-copy">
          <strong>{storeName}</strong>
          <small>Store</small>
        </span>
        <EllipsisHorizontal aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Positioner className="admin-account-menu-positioner">
        <Popover.Content className="admin-account-menu-popover">
          <div className="admin-account-menu-summary">
            <span className="admin-brand-mark">{fallback}</span>
            <span className="admin-account-menu-copy">
              <strong>{storeName}</strong>
              <small>Store</small>
            </span>
          </div>
          <Link
            className="admin-account-menu-item"
            onClick={() => setOpen(false)}
            to="/settings/store"
          >
            <BuildingStorefront aria-hidden="true" />
            <span>Store settings</span>
          </Link>
          <button
            className="admin-account-menu-item"
            onClick={handleLogout}
            type="button"
          >
            <OpenRectArrowOut aria-hidden="true" />
            <span>Log out</span>
          </button>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}

function getStoreFallback(storeName: string) {
  const fallback = storeName.trim().slice(0, 1).toUpperCase()

  return fallback || "N"
}

function SidebarItem({
  item,
  summary,
}: {
  item: AdminNavItem
  summary: ActionRequiredSummary | undefined
}) {
  const location = useLocation()
  const badge = getBadgeValue(item.badgeKey, summary)
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
      {badge && shouldRenderBadge(badge) && (
        <Badge className="admin-count-badge" size="sm" variant="danger">
          {formatCountLabel(badge.count, badge.countExact)}
        </Badge>
      )}
    </NavLink>
  )
}

type BadgeValue = {
  count: number
  countExact: boolean
}

function getBadgeValue(
  badgeKey: BadgeKey | undefined,
  summary: ActionRequiredSummary | undefined
): BadgeValue | null {
  if (badgeKey === "ordersActionRequired") {
    return summary?.orders
      ? {
          count: summary.orders.count,
          countExact: summary.orders.count_exact,
        }
      : null
  }

  if (badgeKey === "customersActionRequired") {
    return summary?.customers
      ? {
          count: summary.customers.count,
          countExact: summary.customers.count_exact,
        }
      : null
  }

  return null
}

function shouldRenderBadge(badge: BadgeValue) {
  return badge.count > 0 || !badge.countExact
}

function formatCountLabel(count: number, countExact: boolean) {
  return countExact ? String(count) : `${count}+`
}
