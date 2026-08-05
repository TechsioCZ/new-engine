"use client"

import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import { AccountSurface } from "@/components/account/account-surface"
import { AccountOrderDetailItems } from "@/components/account/orders/account-order-detail-items"
import { AccountOrderDetailSummary } from "@/components/account/orders/account-order-detail-summary"
import NextLink from "@/components/app-link"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { resolveOrderDisplayId } from "@/lib/storefront/order-format"
import { useOrder } from "@/lib/storefront/orders"

interface AccountOrderDetailProps {
  orderId: string
}

export function AccountOrderDetail({ orderId }: AccountOrderDetailProps) {
  const tAuth = useTranslations("auth")
  const tNavigation = useTranslations("navigation")
  const authQuery = useAuth()
  const orderQuery = useOrder({
    enabled: authQuery.isAuthenticated,
    id: orderId,
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
          as={NextLink}
          href="/account/orders"
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
          as={NextLink}
          href="/account/orders"
          size="sm"
          variant="secondary"
        >
          {tAuth("account.orders.back")}
        </LinkButton>
      </AccountSurface>
    )
  }

  const { order } = orderQuery

  return (
    <div className="space-y-400">
      <HerbatikaBreadcrumb
        items={[
          { href: "/", label: tNavigation("breadcrumbs.home") },
          { href: "/account", label: tAuth("account_label") },
          {
            href: "/account/orders",
            label: tAuth("account.navigation.orders"),
          },
          { label: resolveOrderDisplayId(order) },
        ]}
      />

      <AccountOrderDetailSummary
        {...(authQuery.customer?.email === undefined
          ? {}
          : { customerEmail: authQuery.customer?.email })}
        order={order}
      />

      <AccountOrderDetailItems order={order} />
    </div>
  )
}
