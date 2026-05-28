import {
  BuildingStorefront,
  EllipsisHorizontal,
  OpenRectArrowOut,
} from "@medusajs/icons"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import {
  Popover,
  type PopoverRootProps,
} from "@techsio/ui-kit/molecules/popover"
import { Fragment, useEffect, useState } from "react"
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { useAdminStoreSummary, usePendingB2BCustomers } from "./admin-api"
import { clearStoredAdminToken, hasStoredAdminToken } from "./admin-auth"
import { CategoriesPage, CategoryDetailPage } from "./admin-category-pages"
import { isAuthError } from "./admin-errors"
import { LoginPage } from "./admin-login-page"
import { OrderDetailPage } from "./admin-order-detail-page"
import { OrderExpeditionPage } from "./admin-order-expedition-page"
import { PacketaLabelsPage } from "./admin-packeta-labels-page"
import { PacketaSettingsPage } from "./admin-packeta-settings-page"
import {
  CustomersPage,
  EmailsPage,
  PlaceholderPage,
  ProductsPage,
} from "./admin-pages"
import { PayloadSettingsPage } from "./admin-payload-settings-page"
import { PplSettingsPage } from "./admin-ppl-settings-page"
import { ProductDetailPage } from "./admin-product-detail-page"
import { QrPaymentsSettingsPage, SettingsPage } from "./admin-settings-page"
import { StoreSettingsPage } from "./admin-store-settings-page"
import type { AdminStoreSummary, BadgeKey } from "./admin-types"
import { AdminThemeToggle } from "./components/admin-theme-toggle"
import { type AdminNavItem, adminNavItems } from "./nav-config"
import { useOrderExpeditionDashboardCount } from "./order-expedition/api/queries"
import { ALL_CARRIERS } from "./order-expedition/model/views"
import { formatCountLabel } from "./utils/format"

const ADMIN_SHELL_CLASS_NAME =
  "grid min-h-dvh grid-cols-[var(--spacing-admin-shell-sidebar)_minmax(0,1fr)] bg-base max-admin-layout:grid-cols-1"

const ADMIN_SIDEBAR_CLASS_NAME =
  "flex flex-col gap-12 border-border-primary border-e bg-surface px-7 py-9 max-admin-layout:sticky max-admin-layout:top-0 max-admin-layout:z-10 max-admin-layout:border-e-0 max-admin-layout:border-b"

const ADMIN_NAV_ITEM_CLASS_NAME =
  "grid min-h-18 grid-cols-[var(--spacing-14)_minmax(0,1fr)_auto] items-center gap-4 rounded-md px-4 py-2 text-fg-secondary transition-all duration-200 hover:bg-fill-hover focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) motion-reduce:transition-none"

const ACCOUNT_MENU_PLACEMENT = ["bottom", "start"].join("-") as NonNullable<
  PopoverRootProps["placement"]
>

export function AdminApp() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredAdminToken)
  const isLoginRoute = location.pathname === "/login"
  const sidebarBadgesEnabled = isAuthenticated && !isLoginRoute
  const ordersActionRequired = useOrderExpeditionDashboardCount({
    carrier: ALL_CARRIERS,
    enabled: sidebarBadgesEnabled,
    view: "action-required",
  })
  const customersActionRequired = usePendingB2BCustomers({
    enabled: sidebarBadgesEnabled,
  })
  const sidebarBadgeAuthError =
    (ordersActionRequired.isError && isAuthError(ordersActionRequired.error)) ||
    (customersActionRequired.isError &&
      isAuthError(customersActionRequired.error))
  const sidebarBadges: SidebarBadges = {
    customersActionRequired: customersActionRequired.data
      ? {
          count: customersActionRequired.data.count,
          countExact: customersActionRequired.data.count_exact,
        }
      : null,
    ordersActionRequired: ordersActionRequired.data
      ? {
          count: ordersActionRequired.data.count,
          countExact: ordersActionRequired.data.count_exact,
        }
      : null,
  }

  useEffect(() => {
    if (sidebarBadgeAuthError) {
      clearStoredAdminToken()
      setIsAuthenticated(false)
      queryClient.clear()
    }
  }, [queryClient, sidebarBadgeAuthError])

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
      <Sidebar badges={sidebarBadges} onLogout={handleLogout} />
      <main className="min-w-0 p-14 max-admin-layout:p-10">
        {sidebarBadgeAuthError ? (
          <Navigate replace to="/login" />
        ) : (
          <Routes>
            <Route
              element={<Navigate replace to="/orders?view=action-required" />}
              path="/"
            />
            <Route element={<OrderExpeditionPage />} path="/orders" />
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
            <Route element={<CategoriesPage />} path="/categories" />
            <Route element={<CategoryDetailPage />} path="/categories/:id" />
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
  badges,
  onLogout,
}: {
  badges: SidebarBadges
  onLogout: () => void
}) {
  const store = useAdminStoreSummary()
  let currentSection: string | undefined

  return (
    <aside aria-label="Admin navigation" className={ADMIN_SIDEBAR_CLASS_NAME}>
      <AccountMenu store={store.data} />
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
              <SidebarItem badges={badges} item={item} />
            </Fragment>
          )
        })}
      </nav>
      <div className="mt-auto grid gap-2">
        <AdminThemeToggle />
        <Button
          block
          className="justify-start gap-2 [&_svg]:size-8"
          onClick={onLogout}
          size="sm"
          theme="outlined"
          type="button"
          variant="danger"
        >
          <OpenRectArrowOut aria-hidden="true" />
          Odhlasit
        </Button>
      </div>
    </aside>
  )
}

function AccountMenu({
  store,
}: {
  store: AdminStoreSummary | null | undefined
}) {
  const [open, setOpen] = useState(false)
  const storeName = store?.name || "New Engine"
  const fallback = getStoreFallback(storeName)

  return (
    <Popover.Root
      id="admin-account-menu"
      onOpenChange={(details) => setOpen(details.open)}
      open={open}
      placement={ACCOUNT_MENU_PLACEMENT}
      sameWidth
    >
      <Popover.Trigger
        className="focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-offset-(length:--default-ring-offset) grid min-h-22 w-full grid-cols-[var(--spacing-17)_minmax(0,1fr)_var(--spacing-9)] items-center gap-4 rounded-md px-4 py-2 text-left text-fg-primary transition-all duration-200 hover:bg-fill-hover focus-visible:outline-ring data-[state=open]:bg-fill-hover motion-reduce:transition-none"
        size="current"
        theme="unstyled"
      >
        <span className="inline-flex size-17 items-center justify-center rounded-md border border-border-tertiary bg-primary font-bold text-fg-reverse text-xs">
          {fallback}
        </span>
        <span className="block min-w-0 text-left">
          <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-bold text-fg-primary text-sm leading-tight">
            {storeName}
          </strong>
          <small className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-fg-secondary text-xs leading-tight">
            Store
          </small>
        </span>
        <EllipsisHorizontal
          aria-hidden="true"
          className="ms-auto text-fg-tertiary"
        />
      </Popover.Trigger>
      <Popover.Positioner className="z-20">
        <Popover.Content className="grid w-58 gap-2 rounded-md border border-border-primary bg-surface p-2 shadow-sm">
          <div className="grid grid-cols-[var(--spacing-17)_minmax(0,1fr)] items-center gap-4 border-border-primary border-b px-2 pb-3">
            <span className="inline-flex size-17 items-center justify-center rounded-md border border-border-tertiary bg-primary font-bold text-fg-reverse text-xs">
              {fallback}
            </span>
            <span className="block min-w-0 text-left">
              <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-bold text-fg-primary text-sm leading-tight">
                {storeName}
              </strong>
              <small className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-fg-secondary text-xs leading-tight">
                Store
              </small>
            </span>
          </div>
          <Link
            className="focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-offset-(length:--default-ring-offset) grid min-h-17 grid-cols-[var(--spacing-9)_minmax(0,1fr)] items-center gap-3 rounded-md px-3 py-2 font-semibold text-fg-secondary text-sm transition-colors duration-200 hover:bg-fill-hover hover:text-fg-primary focus-visible:outline-ring motion-reduce:transition-none [&_svg]:size-8 [&_svg]:text-fg-tertiary"
            onClick={() => setOpen(false)}
            to="/settings/store"
          >
            <BuildingStorefront aria-hidden="true" />
            <span>Store settings</span>
          </Link>
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
  badges,
  item,
}: {
  badges: SidebarBadges
  item: AdminNavItem
}) {
  const location = useLocation()
  const badge = getBadgeValue(item.badgeKey, badges)
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
        <Badge className="size-14" size="sm" variant="danger">
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

type SidebarBadges = Record<BadgeKey, BadgeValue | null>

function getBadgeValue(
  badgeKey: BadgeKey | undefined,
  badges: SidebarBadges
): BadgeValue | null {
  return badgeKey ? badges[badgeKey] : null
}

function shouldRenderBadge(badge: BadgeValue) {
  return badge.count > 0
}
