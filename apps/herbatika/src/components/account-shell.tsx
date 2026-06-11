"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { AccountLayoutSkeleton } from "@/components/loading/account-layout-skeleton"
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { useLogoutAction } from "@/lib/storefront/use-logout-action"

type AccountNavItemType = {
  href: string
  label: string
  icon: IconType
}

const ACCOUNT_NAV_ITEMS: AccountNavItemType[] = [
  { href: "/account", label: "Prehľad", icon: "token-icon-user" },
  { href: "/account/orders", label: "Objednávky", icon: "token-icon-order" },
  { href: "/account/lists", label: "Zoznamy", icon: "token-icon-heart" },
  {
    href: "/account/settings",
    label: "Nastavenia",
    icon: "token-icon-settings",
  },
] as const

const isNavItemActive = (pathname: string, href: string) => {
  if (pathname === href) {
    return true
  }

  if (href === "/account") {
    return false
  }

  return pathname.startsWith(`${href}/`)
}

type AccountShellProps = {
  children: ReactNode
}

export function AccountShell({ children }: AccountShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const authQuery = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const redirectTarget = pathname
  const isOrdersListRoute = pathname === "/account/orders"
  const isOrderDetailRoute = pathname.startsWith("/account/orders/")
  const {
    clearLogoutError,
    handleLogout: performLogout,
    logoutError,
    logoutMutation,
  } = useLogoutAction({
    onSuccess: () => {
      router.replace("/")
    },
  })

  useEffect(() => {
    if (isLoggingOut) {
      return
    }

    if (authQuery.isLoading || authQuery.isAuthenticated) {
      return
    }

    router.replace(`/auth/login?next=${encodeURIComponent(redirectTarget)}`)
  }, [
    authQuery.isAuthenticated,
    authQuery.isLoading,
    isLoggingOut,
    redirectTarget,
    router,
  ])

  const handleLogout = async () => {
    clearLogoutError()
    setIsLoggingOut(true)

    const result = await performLogout()
    if (!result.ok) {
      setIsLoggingOut(false)
    }
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
            Presmerovanie na prihlásenie
          </h1>
          <p className="text-fg-secondary text-sm">
            Účet je dostupný iba pre prihlásených používateľov.
          </p>
          <LinkButton
            as={NextLink}
            href={`/auth/login?next=${encodeURIComponent(redirectTarget)}`}
            size="sm"
            variant="secondary"
          >
            Prihlásiť sa
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
                  <span>{item.label}</span>
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
            <span>Odhlásiť</span>
          </Button>
        </aside>

        <section className="w-full min-w-0 max-w-account-content">
          {children}
        </section>
      </div>
    </main>
  )
}
