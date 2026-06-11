"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import NextLink from "next/link"
import { parseAsInteger, useQueryState } from "nuqs"
import { useCallback, useEffect, useTransition } from "react"
import { AccountSurface } from "@/components/account/account-surface"
import { AccountOrderGroup } from "@/components/account/orders/account-order-group"
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton"
import { useAuth } from "@/lib/storefront/auth"
import { getOrderDetailQueryOptions, useOrders } from "@/lib/storefront/orders"
import { usePaginationUrlBuilder } from "@/lib/storefront/use-pagination-url-builder"

const ORDER_PAGE_SIZE = 10

export function AccountOrdersList() {
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

  const setPage = useCallback(
    (nextPage: number, replaceHistoryEntry = false) => {
      const normalizedPage = Math.max(1, nextPage)
      startTransition(() => {
        void setCurrentPage(normalizedPage, {
          history: replaceHistoryEntry ? "replace" : "push",
        })
      })
    },
    [setCurrentPage]
  )

  useEffect(() => {
    if (ordersQuery.totalPages < 1) {
      return
    }

    if (currentPage <= ordersQuery.totalPages) {
      return
    }

    setPage(ordersQuery.totalPages, true)
  }, [currentPage, ordersQuery.totalPages, setPage])

  const prefetchOrderDetail = useCallback(
    (orderId: string) => {
      void queryClient.prefetchQuery(
        getOrderDetailQueryOptions({ id: orderId })
      )
    },
    [queryClient]
  )

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
            void ordersQuery.query.refetch()
          }}
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </AccountSurface>
    )
  }

  if (ordersQuery.orders.length === 0) {
    return (
      <AccountSurface className="space-y-400">
        <h2 className="font-semibold text-lg">Objednávky</h2>
        <p className="text-fg-secondary text-sm">
          Zatiaľ nemáte žiadnu dokončenú objednávku.
        </p>
        <LinkButton as={NextLink} href="/" variant="secondary">
          Prejsť na produkty
        </LinkButton>
      </AccountSurface>
    )
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="font-semibold text-lg">Objednávky</h2>
        <p className="text-fg-secondary text-sm">
          Prehľad dokončených objednávok s položkami a stavom doručenia.
        </p>
        <p className="text-fg-tertiary text-xs">{`Celkom: ${ordersQuery.totalCount} | Strana ${currentPage}/${ordersQuery.totalPages}`}</p>
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
