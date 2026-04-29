"use client"
import {
  createPaginationGetPageUrl,
  Pagination,
} from "@techsio/ui-kit/molecules/pagination"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { useSuspenseOrders } from "@/hooks/use-orders"
import { DesktopOrderCard } from "./orders/desktop-order-card"
import { MobileOrderCard } from "./orders/mobile-order-card"
import { OrdersEmpty } from "./orders/orders-empty"
import { OrdersError } from "./orders/orders-error"
import { OrdersSkeleton } from "./orders/orders-skeleton"
import { OrdersSummary } from "./orders/orders-summary"

const MIN_ORDERS_COUNT = 5
const PAGE_SIZE = 5

function parsePageParam(value: string | null) {
  if (!value) {
    return 1
  }

  const parsedPage = Number(value)
  return Number.isFinite(parsedPage) ? Math.trunc(parsedPage) : 1
}

export function OrderList() {
  return (
    <ErrorBoundary fallback={<OrdersError />}>
      <Suspense fallback={<OrdersSkeleton itemsCount={MIN_ORDERS_COUNT} />}>
        <OrderListContent />
      </Suspense>
    </ErrorBoundary>
  )
}

function OrderListContent() {
  const searchParams = useSearchParams()
  const { data: ordersData } = useSuspenseOrders()

  const orders = ordersData?.orders || []
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const requestedPage = parsePageParam(searchParams.get("ordersPage"))
  const page = Math.min(Math.max(requestedPage, 1), totalPages)

  // Calculate summary stats (from all orders, not just current page)
  const totalAmount = orders.reduce(
    (sum, order) =>
      sum + (order.summary?.current_order_total || order.total || 0),
    0
  )
  const completedOrders = orders.filter(
    (order) => order.status === "completed"
  ).length
  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length

  // Pagination
  const startIndex = (page - 1) * PAGE_SIZE
  const paginatedOrders = orders.slice(startIndex, startIndex + PAGE_SIZE)
  const getPageUrl = createPaginationGetPageUrl({
    pathname: "/ucet/profil",
    searchParams: searchParams.toString(),
    pageParam: "ordersPage",
    searchParamOverrides: {
      tab: "orders",
    },
  })

  return (
    <div className="space-y-400">
      {/* Summary section */}
      <OrdersSummary
        completedOrders={completedOrders}
        numberOfOrders={orders.length}
        pendingOrders={pendingOrders}
        totalAmount={totalAmount}
      />

      {/* Content */}
      {orders.length === 0 ? (
        <OrdersEmpty />
      ) : (
        <>
          {/* Mobile view */}
          <div className="block space-y-200 sm:hidden">
            {paginatedOrders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden overflow-hidden rounded border border-border-secondary bg-base sm:block">
            <div className="grid grid-cols-12 gap-300 border-border-secondary border-b bg-surface p-300 font-medium text-fg-secondary text-sm uppercase tracking-wider">
              <div className="col-span-2">Číslo</div>
              <div className="col-span-2">Datum</div>
              <div className="col-span-4">Položky</div>
              <div className="col-span-2 text-right">Celkem</div>
              <div className="col-span-2 text-right">Akce</div>
            </div>
            {paginatedOrders.map((order) => (
              <DesktopOrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Pagination */}
          {orders.length > PAGE_SIZE && (
            <Pagination
              count={orders.length}
              getPageUrl={getPageUrl}
              linkAs={Link}
              page={page}
              pageSize={PAGE_SIZE}
              size="sm"
            />
          )}
        </>
      )}
    </div>
  )
}
