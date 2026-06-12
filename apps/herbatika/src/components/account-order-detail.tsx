"use client"

import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { AccountSurface } from "@/components/account/account-surface"
import { AccountOrderDetailItems } from "@/components/account/orders/account-order-detail-items"
import { AccountOrderDetailSummary } from "@/components/account/orders/account-order-detail-summary"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { OrderSkeleton } from "@/components/loading/order-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { resolveOrderDisplayId } from "@/lib/storefront/order-format"
import { useOrder } from "@/lib/storefront/orders"

type AccountOrderDetailProps = {
  orderId: string
}

export function AccountOrderDetail({ orderId }: AccountOrderDetailProps) {
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
          as={NextLink}
          href="/account/orders"
          size="sm"
          variant="secondary"
        >
          Späť na objednávky
        </LinkButton>
      </AccountSurface>
    )
  }

  if (!orderQuery.order) {
    return (
      <AccountSurface className="space-y-400">
        <h2 className="font-semibold text-lg">Objednávka nebola nájdená</h2>
        <p className="text-fg-secondary text-sm">
          Skontrolujte URL alebo sa vráťte do zoznamu objednávok.
        </p>
        <LinkButton
          as={NextLink}
          href="/account/orders"
          size="sm"
          variant="secondary"
        >
          Späť na objednávky
        </LinkButton>
      </AccountSurface>
    )
  }

  const order = orderQuery.order

  return (
    <div className="space-y-400">
      <HerbatikaBreadcrumb
        items={[
          { label: "Domov", href: "/" },
          { label: "Účet", href: "/account" },
          { label: "Objednávky", href: "/account/orders" },
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
