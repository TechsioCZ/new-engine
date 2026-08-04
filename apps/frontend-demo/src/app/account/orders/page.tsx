"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { DesktopOrderCard } from "@/components/account/desktop-order-card"
import { MobileOrderCard } from "@/components/account/mobile-order-card"
import { OrdersEmpty } from "@/components/account/orders-empty"
import { OrdersError } from "@/components/account/orders-error"
import { OrdersSkeleton } from "@/components/account/orders-skeleton"
import { OrdersSummary } from "@/components/account/orders-summary"
import { OrdersTableHeader } from "@/components/account/orders-table-header"
import { useAuth } from "@/hooks/use-auth"
import { useOrders } from "@/hooks/use-orders"

const MIN_ORDERS_COUNT = 5
export default function OrdersPage() {
  const { user, isLoading: authLoading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/auth/login")
    }
  }, [user, isInitialized, router])

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error,
  } = useOrders(user?.id)

  if (!isInitialized || authLoading) {
    return (
      <div className="mx-auto max-w-layout-max p-orders-container">
        <OrdersSkeleton itemsCount={MIN_ORDERS_COUNT} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const orders = ordersData?.orders || []

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

  return (
    <div className="mx-auto max-w-layout-max p-orders-container">
      {ordersLoading ? (
        <OrdersSkeleton itemsCount={orders.length || MIN_ORDERS_COUNT} />
      ) : (
        <>
          <OrdersSummary
            completedOrders={completedOrders}
            numberOfOrders={orders.length}
            pendingOrders={pendingOrders}
            totalAmount={totalAmount}
          />

          {error ? (
            <OrdersError />
          ) : orders.length === 0 ? (
            <OrdersEmpty />
          ) : (
            <>
              {/* Mobile view */}
              <div className="block space-y-3 sm:hidden">
                {orders.map((order) => (
                  <MobileOrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* Desktop view */}
              <div className="hidden overflow-hidden rounded-sm border border-orders-border bg-orders-card-bg sm:block">
                <OrdersTableHeader />
                {orders.map((order) => (
                  <DesktopOrderCard key={order.id} order={order} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
