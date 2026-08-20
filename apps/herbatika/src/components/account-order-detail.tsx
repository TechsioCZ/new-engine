"use client"

import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { AccountSurface } from "@/components/account/account-surface"
import { AccountOrderDetailItems } from "@/components/account/orders/account-order-detail-items"
import { AccountOrderDetailSummary } from "@/components/account/orders/account-order-detail-summary"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { StorefrontLink } from "@/components/storefront-link"
import { useAuth } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { resolveOrderDisplayId } from "@/lib/storefront/order-format"
import { useOrder } from "@/lib/storefront/orders"
import { buildPath } from "@/lib/url/public-url"

type AccountOrderDetailProps = {
  orderId: string
}

export function AccountOrderDetail({ orderId }: AccountOrderDetailProps) {
  const tAuth = useTranslations("auth")
  const tNavigation = useTranslations("navigation")
  const { code: market } = useMarketContext()
  const homeHref = buildPath({ kind: "home" }, market)
  const accountHref = buildPath({ kind: "account" }, market)
  const ordersHref = buildPath({ kind: "account", section: "orders" }, market)
  const authQuery = useAuth()
  const orderQuery = useOrder({
    id: orderId,
    enabled: authQuery.isAuthenticated,
  })

  if (authQuery.isLoading || orderQuery.isLoading) {
    return <OrderSkeleton />
  }

  if (orderQuery.error) {
    return (
      <AccountSurface className="space-y-400">
        <StatusText showIcon status="error">
          {orderQuery.error}
        </StatusText>
        <LinkButton
          as={StorefrontLink}
          href={ordersHref}
          size="sm"
          variant="secondary"
        >
          {tAuth("account.orders.back")}
        </LinkButton>
      </AccountSurface>
    )
  }

  if (!orderQuery.order) {
    return (
      <AccountSurface className="space-y-400">
        <h2 className="font-semibold text-lg">
          {tAuth("account.orders.not_found_title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.orders.not_found_description")}
        </p>
        <LinkButton
          as={StorefrontLink}
          href={ordersHref}
          size="sm"
          variant="secondary"
        >
          {tAuth("account.orders.back")}
        </LinkButton>
      </AccountSurface>
    )
  }

  const order = orderQuery.order

  return (
    <div className="space-y-400">
      <HerbatikaBreadcrumb
        items={[
          { label: tNavigation("breadcrumbs.home"), href: homeHref },
          { label: tAuth("account_label"), href: accountHref },
          {
            label: tAuth("account.navigation.orders"),
            href: ordersHref,
          },
          { label: resolveOrderDisplayId(order) },
        ]}
      />

      <AccountOrderDetailSummary
        customerEmail={authQuery.customer?.email}
        order={order}
      />

      <AccountOrderDetailItems order={order} />
    </div>
  )
}
