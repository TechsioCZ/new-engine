"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { parseAsInteger, useQueryState } from "nuqs"
import { useEffect, useTransition } from "react"
import { AccountSurface } from "@/components/account/account-surface"
import { AccountOrderGroup } from "@/components/account/orders/account-order-group"
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { getOrderDetailQueryOptions, useOrders } from "@/lib/storefront/orders"
import { usePaginationUrlBuilder } from "@/lib/storefront/use-pagination-url-builder"

const ORDER_PAGE_SIZE = 10

export function AccountOrdersList() {
  const tAuth = useTranslations("auth")
  const queryClient = useQueryClient()
  const authQuery = useAuth()
  const [isPageTransitionPending, startTransition] = useTransition()
  const getPageUrl = usePaginationUrlBuilder()
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  )
  const ordersQuery = useOrders({
    page: currentPage,
    limit: ORDER_PAGE_SIZE,
    enabled: authQuery.isAuthenticated,
  })
  const hasVisibleOrders = ordersQuery.orders.length > 0
  const isOrdersRefreshing =
    (ordersQuery.query.isFetching || isPageTransitionPending) &&
    (hasVisibleOrders || ordersQuery.query.isPlaceholderData)

  useEffect(() => {
    if (ordersQuery.totalPages < 1) {
      return
    }

    if (currentPage <= ordersQuery.totalPages) {
      return
    }

    const normalizedPage = Math.max(1, ordersQuery.totalPages)
    startTransition(() => {
      runDetachedPromise(
        setCurrentPage(normalizedPage, {
          history: "replace",
        })
      )
    })
  }, [currentPage, ordersQuery.totalPages, setCurrentPage])

  const prefetchOrderDetail = (orderId: string) => {
    runDetachedPromise(
      queryClient.prefetchQuery(getOrderDetailQueryOptions({ id: orderId }))
    )
  }

  if (authQuery.isLoading || (ordersQuery.isLoading && !hasVisibleOrders)) {
    return <AccountOrdersSkeleton />
  }

  if (ordersQuery.error) {
    return (
      <AccountSurface className="space-y-400">
        <StatusText showIcon status="error">
          {ordersQuery.error}
        </StatusText>
        <Button
          onClick={() => {
            runDetachedPromise(ordersQuery.query.refetch())
          }}
          variant="secondary"
        >
          {tAuth("account.orders.retry")}
        </Button>
      </AccountSurface>
    )
  }

  if (ordersQuery.orders.length === 0) {
    return (
      <AccountSurface className="space-y-400">
        <h2 className="font-semibold text-lg">
          {tAuth("account.navigation.orders")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.orders.empty_description")}
        </p>
        <LinkButton as={NextLink} href="/" size="sm" variant="secondary">
          {tAuth("account.orders.browse_products")}
        </LinkButton>
      </AccountSurface>
    )
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="font-semibold text-lg">
          {tAuth("account.navigation.orders")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.orders.description")}
        </p>
        <p className="text-fg-tertiary text-xs">
          {tAuth("account.orders.pagination_summary", {
            count: ordersQuery.totalCount,
            currentPage,
            totalPages: ordersQuery.totalPages,
          })}
        </p>
      </header>

      {isOrdersRefreshing ? (
        <Skeleton.Rectangle className="h-100 rounded-full" speed="fast" />
      ) : null}

      <div className="space-y-300">
        {ordersQuery.orders.map((order) => (
          <AccountOrderGroup
            key={order.id}
            onPrefetchOrderDetail={prefetchOrderDetail}
            order={order}
          />
        ))}
      </div>

      {ordersQuery.totalPages > 1 && (
        <Pagination
          count={ordersQuery.totalCount}
          getPageUrl={getPageUrl}
          linkAs={NextLink}
          page={currentPage}
          pageSize={ORDER_PAGE_SIZE}
          size="sm"
          variant="outlined"
        />
      )}
    </AccountSurface>
  )
}
