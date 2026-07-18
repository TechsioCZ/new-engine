"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { HeurekaOrder } from "@techsio/analytics/heureka"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { CheckoutReview } from "@/app/pokladna/_components/checkout-review"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { useAnalytics } from "@/providers/analytics-provider"
import { getOrderById } from "@/services/order-service"

export default function OrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params["orderId"] as string
  const showSuccessBanner = searchParams.get("success") === "true"

  const analytics = useAnalytics()
  const purchaseTracked = useRef(false)

  if (!orderId) {
    throw new Error("Order ID je povinné")
  }

  const { data: order } = useSuspenseQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrderById(orderId),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message?.includes("nenalezena")) {
        return false
      }
      return failureCount < 2
    },
    ...cacheConfig.semiStatic,
  })

  // Unified analytics - Purchase tracking (sends to Meta, Google, Leadhub)
  // Only on new purchases with success=true
  useEffect(() => {
    if (!(showSuccessBanner && order) || purchaseTracked.current) {
      return
    }

    purchaseTracked.current = true

    const items = order.items || []
    const currency = (order.currency_code ?? "CZK").toUpperCase()
    const value = order.total ?? 0

    analytics.trackPurchase({
      orderId: order.id,
      value,
      currency,
      numItems: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      products: items.map((item) => ({
        id: item.variant_id || "",
        name: item.title || "",
        price: item.unit_price ?? 0,
        currency,
        quantity: item.quantity || 1,
      })),
      ...(order.email ? { email: order.email } : {}),
    })
  }, [showSuccessBanner, order, analytics])

  return (
    <div className="container mx-auto min-h-screen p-500">
      {/* Heureka conversion tracking - standalone, SDK loads here */}
      {showSuccessBanner && order && (
        <HeurekaOrder
          apiKey={process.env["NEXT_PUBLIC_HEUREKA_API_KEY"] ?? ""}
          country="cz"
          currency={(order.currency_code ?? "CZK").toUpperCase()}
          debug
          orderId={order.id}
          products={
            order.items?.map((item) => ({
              id: item.variant_id || "",
              name: item.title || "",
              priceWithVat: item.unit_price ?? 0,
              quantity: item.quantity || 1,
            })) ?? []
          }
          totalWithVat={order.total ?? 0}
        />
      )}

      {showSuccessBanner && (
        <div className="mb-500 rounded-lg border border-success bg-success/10 p-400">
          <h2 className="font-semibold text-fg-primary text-lg">
            ✓ Objednávka byla úspěšně vytvořena!
          </h2>
          <p className="mt-100 text-fg-secondary text-sm">
            Děkujeme za vaši objednávku. Potvrzení jsme vám odeslali na e-mail.
          </p>
        </div>
      )}

      <CheckoutReview order={order} />
    </div>
  )
}
