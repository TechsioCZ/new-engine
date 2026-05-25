import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
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
import type { ActionRequiredSummary, BadgeKey } from "./admin-types"
import { AdminThemeToggle } from "./components/admin-theme-toggle"
import { type AdminNavItem, adminNavItems } from "./nav-config"
import { formatCountLabel } from "./utils/format"

const ADMIN_SHELL_CLASS_NAME =
  "grid min-h-dvh grid-cols-[var(--spacing-admin-shell-sidebar)_minmax(0,1fr)] bg-base max-admin-layout:grid-cols-1"

const ADMIN_SIDEBAR_CLASS_NAME =
  "flex flex-col gap-12 border-border-primary border-e bg-surface px-7 py-9 max-admin-layout:sticky max-admin-layout:top-0 max-admin-layout:z-10 max-admin-layout:border-e-0 max-admin-layout:border-b"

const ADMIN_NAV_ITEM_CLASS_NAME =
  "grid min-h-18 grid-cols-[var(--spacing-14)_minmax(0,1fr)_auto] items-center gap-4 rounded-md px-4 py-2 text-fg-secondary transition-all duration-200 hover:bg-fill-hover focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) motion-reduce:transition-none"

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
    <div className={ADMIN_SHELL_CLASS_NAME}>
      <Sidebar onLogout={handleLogout} summary={summary.data} />
      <main className="min-w-0 p-14 max-admin-layout:p-10">
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

function Sidebar({
  onLogout,
  summary,
}: {
  onLogout: () => void
  summary: ActionRequiredSummary | undefined
}) {
  let currentSection: string | undefined

  return (
    <aside aria-label="Admin navigation" className={ADMIN_SIDEBAR_CLASS_NAME}>
      <div className="flex min-h-22 items-center gap-6 px-4">
        <span className="inline-flex size-17 items-center justify-center rounded-md border border-border-tertiary bg-primary font-bold text-fg-reverse text-xs">
          NE
        </span>
        <span>
          <strong className="block leading-tight">New Engine</strong>
          <small className="mt-50 block text-fg-secondary text-xs leading-tight">
            Admin
          </small>
        </span>
      </div>
      <nav className="flex flex-col gap-2 max-admin-layout:grid max-admin-layout:grid-cols-2">
        {adminNavItems.map((item) => {
          const shouldRenderSection = item.section !== currentSection
          currentSection = item.section

          return (
            <Fragment key={item.href}>
              {shouldRenderSection && item.section && (
                <span className="mx-4 mt-8 mb-3 font-bold text-fg-tertiary text-xs uppercase first:mt-0">
                  {item.section}
                </span>
              )}
              <SidebarItem item={item} summary={summary} />
            </Fragment>
          )
        })}
      </nav>
      <div className="mt-auto grid gap-2">
        <AdminThemeToggle />
        <Button
          block
          className="justify-start"
          onClick={onLogout}
          size="sm"
          theme="outlined"
          type="button"
          variant="danger"
        >
          Odhlasit
        </Button>
      </div>
    </aside>
  )
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
          ADMIN_NAV_ITEM_CLASS_NAME,
          isActive
            ? "bg-surface text-fg-primary shadow-sm ring-1 ring-border-secondary"
            : "",
          isPending ? "opacity-70" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      to={item.href}
    >
      <span className="inline-flex items-center justify-center text-fg-tertiary [&_svg]:size-9">
        {item.icon}
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-sm">
        {item.label}
      </span>
      {badge && shouldRenderBadge(badge) && (
        <Badge className="min-w-12" size="sm" variant="danger">
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
