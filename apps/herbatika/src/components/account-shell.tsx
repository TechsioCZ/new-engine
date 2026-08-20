"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { AccountLayoutSkeleton } from "@/components/loading/account-layout-skeleton"
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { StorefrontLink } from "@/components/storefront-link"
import { useAuth } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { useLogoutAction } from "@/lib/storefront/use-logout-action"
import { buildPath, withPublicSearchParams } from "@/lib/url/public-url"
import type { AccountChildKey } from "@/lib/url/types"

type AccountNavItemType = {
  section?: Extract<AccountChildKey, "lists" | "orders" | "settings">
  labelKey:
    | "account.navigation.lists"
    | "account.navigation.orders"
    | "account.navigation.overview"
    | "account.navigation.settings"
  icon: IconType
}

const ACCOUNT_NAV_ITEMS: AccountNavItemType[] = [
  {
    labelKey: "account.navigation.overview",
    icon: "token-icon-user",
  },
  {
    section: "orders",
    labelKey: "account.navigation.orders",
    icon: "token-icon-order",
  },
  {
    section: "lists",
    labelKey: "account.navigation.lists",
    icon: "token-icon-heart",
  },
  {
    section: "settings",
    labelKey: "account.navigation.settings",
    icon: "token-icon-settings",
  },
] as const

const isNavItemActive = (
  pathname: string,
  href: string,
  accountHref: string
) => {
  if (pathname === href) {
    return true
  }

  if (href === accountHref) {
    return false
  }

  return pathname.startsWith(`${href}/`)
}

type AccountShellProps = {
  children: ReactNode
}

export function AccountShell({ children }: AccountShellProps) {
  const tAuth = useTranslations("auth")
  const { code: market } = useMarketContext()
  const pathname = usePathname()
  const homeHref = buildPath({ kind: "home" }, market)
  const accountHref = buildPath({ kind: "account" }, market)
  const ordersHref = buildPath({ kind: "account", section: "orders" }, market)
  const deactivationHref = buildPath(
    { kind: "account", section: "deactivation" },
    market
  )
  const authQuery = useAuth({
    queryOptions: {
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
    },
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const stablePathname = pathname ?? ""
  const redirectTarget = pathname ?? accountHref
  const loginHref = withPublicSearchParams(
    buildPath({ kind: "account", section: "login" }, market),
    { next: redirectTarget }
  )
  const isDeactivationConfirmationRoute = pathname === deactivationHref
  const isOrdersListRoute = pathname === ordersHref
  const isOrderDetailRoute = stablePathname.startsWith(`${ordersHref}/`)
  const {
    clearLogoutError,
    handleLogout: performLogout,
    logoutError,
    logoutMutation,
  } = useLogoutAction({
    fallbackErrorMessage: tAuth("account.logout_failed"),
    onSuccess: () => {
      window.location.replace(homeHref)
    },
  })

  useEffect(() => {
    if (isDeactivationConfirmationRoute) {
      return
    }

    if (isLoggingOut) {
      return
    }

    if (!pathname) {
      return
    }

    if (authQuery.isLoading || authQuery.isAuthenticated) {
      return
    }

    window.location.replace(loginHref)
  }, [
    authQuery.isAuthenticated,
    authQuery.isLoading,
    isDeactivationConfirmationRoute,
    isLoggingOut,
    pathname,
    loginHref,
  ])

  const handleLogout = async () => {
    clearLogoutError()
    setIsLoggingOut(true)

    const result = await performLogout()
    if (!result.ok) {
      setIsLoggingOut(false)
    }
  }

  if (isDeactivationConfirmationRoute) {
    return children
  }

  if (authQuery.isLoading) {
    let skeletonSurface: ReactNode
    if (isOrderDetailRoute) {
      skeletonSurface = <OrderSkeleton />
    } else if (isOrdersListRoute) {
      skeletonSurface = <AccountOrdersSkeleton />
    }

    return <AccountLayoutSkeleton surface={skeletonSurface} surfaceLines={4} />
  }

  if (!authQuery.isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
        <section className="space-y-300 rounded-lg border border-border-secondary bg-surface p-550">
          <h1 className="font-semibold text-lg">
            {tAuth("account.redirect.title")}
          </h1>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.redirect.description")}
          </p>
          <LinkButton
            as={StorefrontLink}
            href={loginHref}
            size="sm"
            variant="secondary"
          >
            {tAuth("sign_in")}
          </LinkButton>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <div className="grid gap-account-page-gap lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
          <header className="leading-none">
            <h1 className="font-semibold text-xl">
              {authQuery.customer?.first_name} {authQuery.customer?.last_name}
            </h1>
            <span className="text-fg-secondary text-sm">
              {authQuery.customer?.email ?? "-"}
            </span>
          </header>

          <nav className="flex flex-col gap-200">
            {ACCOUNT_NAV_ITEMS.map((item) => {
              const href = buildPath(
                { kind: "account", section: item.section },
                market
              )
              const isActive = isNavItemActive(
                stablePathname,
                href,
                accountHref
              )

              return (
                <LinkButton
                  as={StorefrontLink}
                  block
                  className="justify-start px-200 text-lg hover:text-primary data-[active=true]:text-primary"
                  data-active={isActive}
                  href={href}
                  key={href}
                  size="current"
                  theme="unstyled"
                >
                  <Icon icon={item.icon} size="2xl" />
                  <span>{tAuth(item.labelKey)}</span>
                </LinkButton>
              )
            })}
          </nav>

          {logoutError && (
            <StatusText showIcon status="error">
              {logoutError}
            </StatusText>
          )}

          <hr className="border-border-primary" />

          <Button
            block
            className="justify-start px-200 text-lg hover:text-danger"
            icon={"token-icon-logout"}
            iconSize="2xl"
            isLoading={logoutMutation.isPending}
            onClick={() => handleLogout()}
            size="current"
            theme="unstyled"
          >
            <span>{tAuth("account.logout")}</span>
          </Button>
        </aside>

        <section className="w-full min-w-0 max-w-account-content">
          {children}
        </section>
      </div>
    </main>
  )
}
