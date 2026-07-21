"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import {
  AccountSkeletonSurface,
  AccountSurface,
} from "@/components/account/account-surface"
import { useAuth } from "@/lib/storefront/auth"
import { useOrders } from "@/lib/storefront/orders"

export function AccountOverview() {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const authQuery = useAuth()
  const ordersQuery = useOrders({
    page: 1,
    limit: 1,
    enabled: authQuery.isAuthenticated,
  })

  if (authQuery.isLoading) {
    return <AccountSkeletonSurface lines={4} />
  }

  if (!authQuery.customer) {
    return null
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">
          {tAuth("account.overview.title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.overview.description")}
        </p>
      </header>

      <ul className="flex flex-col flex-wrap gap-200">
        <li>
          <span>{tAuth("account.overview.customer")}: </span>
          <span className="text-fg-secondary">
            {`${authQuery.customer.first_name ?? ""} ${authQuery.customer.last_name ?? ""}`.trim() ||
              tAuth("account.overview.customer_fallback")}
          </span>
        </li>
        <li>
          <span>{tForm("email")}: </span>
          <span className="text-fg-secondary">
            {authQuery.customer.email ?? "-"}
          </span>
        </li>
        <li>
          <span>{tAuth("account.navigation.orders")}: </span>
          <span className="text-fg-secondary">{`${ordersQuery.totalCount}`}</span>
        </li>
      </ul>

      {ordersQuery.error && (
        <StatusText showIcon status="error">
          {ordersQuery.error}
        </StatusText>
      )}
    </AccountSurface>
  )
}
