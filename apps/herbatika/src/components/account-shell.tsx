"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { redirect, usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"

import {
  ACCOUNT_NAV_ITEMS,
  isNavItemActive,
} from "@/components/account-shell-navigation"
import NextLink from "@/components/app-link"
import { AccountLayoutSkeleton } from "@/components/loading/account-layout-skeleton"
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useLogoutAction } from "@/lib/storefront/use-logout-action"

interface AccountShellProps {
  children: ReactNode
}

export const AccountShell = ({ children }: AccountShellProps) => {
  const tAuth = useTranslations("auth")
  const router = useRouter()
  const pathname = usePathname()
  const authQuery = useAuth()
  const redirectTarget = pathname
  const isDeactivationConfirmationRoute =
    pathname === "/account/deactivate/confirm"
  const isOrdersListRoute = pathname === "/account/orders"
  const isOrderDetailRoute = pathname.startsWith("/account/orders/")
  const {
    clearLogoutError,
    handleLogout: performLogout,
    logoutError,
    logoutMutation,
  } = useLogoutAction({
    fallbackErrorMessage: tAuth("account.logout_failed"),
    onSuccess: () => {
      router.replace("/")
    },
  })

  const handleLogout = async () => {
    clearLogoutError()
    await performLogout()
  }

  if (isDeactivationConfirmationRoute) {
    return <div>{children}</div>
  }

  if (authQuery.isLoading) {
    let skeletonSurface: ReactNode = null
    if (isOrderDetailRoute) {
      skeletonSurface = <OrderSkeleton />
    } else if (isOrdersListRoute) {
      skeletonSurface = <AccountOrdersSkeleton />
    }

    return <AccountLayoutSkeleton surface={skeletonSurface} surfaceLines={4} />
  }

  if (!authQuery.isAuthenticated) {
    if (!logoutMutation.isPending) {
      redirect(`/auth/login?next=${encodeURIComponent(redirectTarget)}`)
    }

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
            as={NextLink}
            href={`/auth/login?next=${encodeURIComponent(redirectTarget)}`}
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
      <div className="grid gap-account-page-gap lg:account-shell-layout lg:items-start">
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
              const isActive = isNavItemActive(pathname, item.href)

              return (
                <LinkButton
                  as={NextLink}
                  block
                  className="justify-start px-200 text-lg hover:text-primary data-[active=true]:text-primary"
                  data-active={isActive}
                  href={item.href}
                  key={item.href}
                  size="current"
                  theme="unstyled"
                >
                  <Icon icon={item.icon} size="2xl" />
                  <span>{tAuth(item.labelKey)}</span>
                </LinkButton>
              )
            })}
          </nav>

          {logoutError !== null && (
            <StatusText showIcon status="error">
              {logoutError}
            </StatusText>
          )}

          <hr className="border-border-primary" />

          <Button
            block
            className="justify-start px-200 text-lg hover:text-danger"
            icon="token-icon-logout"
            iconSize="2xl"
            isLoading={logoutMutation.isPending}
            onClick={() => {
              runDetachedPromise(handleLogout())
            }}
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
