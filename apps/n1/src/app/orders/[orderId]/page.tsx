"use client"

import { HeurekaOrder } from "@techsio/analytics/heureka"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { CheckoutReview } from "@/app/pokladna/_components/checkout-review"
import { OrderNotFoundError } from "@/hooks/order-hooks-base"
import { useSuspensePublicOrder } from "@/hooks/use-orders"
import { cacheConfig } from "@/lib/cache-config"
import { useAnalytics } from "@/providers/analytics-provider"

export default function OrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.orderId as string
  const showSuccessBanner = searchParams.get("success") === "true"

  const analytics = useAnalytics()
  const purchaseTracked = useRef(false)

  if (!orderId) {
    throw new Error("Order ID je povinný")
  }

  const orderResult = useSuspensePublicOrder(orderId, {
    queryOptions: {
      retry: (failureCount, error) => {
        if (error instanceof OrderNotFoundError) {
          return false
        }
        return failureCount < 2
      },
      ...cacheConfig.semiStatic,
    },
  })

  if (!orderResult.order) {
    throw new Error("Objednávka nebyla nalezena")
  }

  const order = orderResult.order

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
      email: order.email || undefined,
    })
  }, [showSuccessBanner, order, analytics])

  return (
    <div className="container mx-auto min-h-screen p-500">
      {/* Heureka conversion tracking - standalone, SDK loads here */}
      {showSuccessBanner && order && (
        <HeurekaOrder
          apiKey={process.env.NEXT_PUBLIC_HEUREKA_API_KEY ?? ""}
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
            Objednávka byla úspěšně vytvořena!
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
