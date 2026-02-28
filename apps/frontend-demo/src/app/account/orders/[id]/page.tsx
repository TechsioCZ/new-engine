"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useEffect } from "react"
import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { useAuth } from "@/hooks/use-auth"
import { useStorefrontOrder } from "@/hooks/storefront-orders"
import { formatPrice } from "@/lib/format-price"
import {
  formatOrderDate,
  getOrderStatusLabel,
  truncateProductTitle,
} from "@/lib/order-utils"

interface OrderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params)
  const { user, isLoading: authLoading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/auth/login")
    }
  }, [user, isInitialized, router])

  const { order, isLoading: orderLoading, error } = useStorefrontOrder(
    {
      id,
      enabled: !!user && !!id,
    },
    {
      queryOptions: {
        staleTime: 5 * 60 * 1000,
      },
    }
  )

  if (!isInitialized || authLoading) {
    return (
      <div className="mx-auto max-w-layout-max px-sm py-lg">
        <div className="space-y-6">
          <SkeletonLoader className="h-12 w-64" />
          <div className="grid gap-6">
            <SkeletonLoader className="h-40 w-full" />
            <SkeletonLoader className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-layout-max px-sm py-lg">
      <div className="mb-md">
        <LinkButton
          as={Link}
          className="mb-4 gap-2"
          href="/account/orders"
          size="sm"
          theme="borderless"
          variant="secondary"
        >
          <Icon className="h-4 w-4" icon="token-icon-arrow-left" />
          Zpět na objednávky
        </LinkButton>

        {order && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-bold text-orders-header-size">
                Objednávka #{order.display_id}
              </h1>
              <p className="text-orders-fg-secondary">
                {formatOrderDate(order.created_at as string)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={order.status === "completed" ? "success" : "warning"}
              >
                {getOrderStatusLabel(order.status)}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-orders-error-border bg-orders-error-bg p-8 text-center">
          <p className="mb-4 font-semibold text-orders-error-fg">
            Chyba při načítání objednávky
          </p>
          <p className="mb-6 text-orders-fg-secondary">
            Objednávka nebyla nalezena nebo k ní nemáte přístup
          </p>
          <Button
            onClick={() => router.push("/account/orders")}
            theme="solid"
            variant="secondary"
          >
            Zpět na seznam objednávek
          </Button>
        </div>
      ) : orderLoading || !order ? (
        <div className="space-y-6">
          <SkeletonLoader className="h-40 w-full" />
          <SkeletonLoader className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-md">
          {/* Products Grid */}
          <div>
            <h2 className="mb-4 font-bold text-xl">Objednané produkty</h2>
            <div className="grid xs:grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {order.items?.map((item) => (
                <div
                  className="group overflow-hidden rounded-lg bg-orders-card-bg shadow-sm transition-all hover:shadow-md"
                  key={item.id}
                >
                  <div className="relative aspect-square overflow-hidden bg-orders-item-overlay-bg">
                    {item.thumbnail ? (
                      <Image
                        alt={item.product_title || ""}
                        className="object-cover"
                        fill
                        src={item.thumbnail}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon
                          className="h-12 w-12 text-orders-empty-icon"
                          icon="token-icon-package"
                        />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 rounded-full bg-orders-overlay px-3 py-1 backdrop-blur-sm">
                      <span className="font-medium text-orders-sm">
                        {item.quantity}x
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <Link
                      className="mb-2 block font-medium text-tertiary hover:text-primary"
                      href={`/products/${item.product_handle}`}
                    >
                      {truncateProductTitle(item.product_title || "")}
                    </Link>
                    <p className="mb-3 text-orders-fg-secondary text-orders-sm">
                      Varianta: {item.variant_title}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-orders-fg-secondary text-orders-sm">
                          Cena za kus
                        </p>
                        <p className="font-semibold text-orders-fg-primary">
                          {formatPrice(
                            item.refundable_total_per_unit,
                            order.currency_code
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-orders-fg-secondary text-orders-sm">
                          Celkem
                        </p>
                        <p className="font-semibold text-md text-orders-fg-primary">
                          {formatPrice(item.total, order.currency_code)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Info Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment Summary */}
            <div className="rounded-lg bg-orders-card-bg p-6">
              <h3 className="mb-4 font-semibold text-lg">Platební přehled</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-orders-fg-secondary">Mezisoučet</span>
                  <span className="font-medium">
                    {formatPrice(
                      order.items?.reduce(
                        (sum, item) => sum + item.subtotal,
                        0
                      ) || 0,
                      order.currency_code
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orders-fg-secondary">DPH (21%)</span>
                  <span className="font-medium">
                    {formatPrice(
                      order.items?.reduce(
                        (sum, item) => sum + item.tax_total,
                        0
                      ) || 0,
                      order.currency_code
                    )}
                  </span>
                </div>
                {order.shipping_methods?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-orders-fg-secondary">{`Doprava (${order.shipping_methods[0].name})`}</span>
                    <span className="font-medium">
                      {formatPrice(
                        order.shipping_methods[0].total || 0,
                        order.currency_code
                      )}
                    </span>
                  </div>
                )}
                <div className="border-orders-border border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-lg">Celkem</span>
                    <span className="font-bold text-orders-fg-primary text-orders-price-size">
                      {formatPrice(
                        order.summary?.current_order_total || order.total || 0,
                        order.currency_code
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="rounded-lg bg-orders-card-bg p-6">
              <h3 className="mb-4 font-semibold text-lg">Detaily objednávky</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-orders-fg-secondary text-orders-sm">
                    ID objednávky
                  </p>
                  <p className="font-mono text-orders-sm">{order.id}</p>
                </div>
                <div>
                  <p className="text-orders-fg-secondary text-orders-sm">
                    Vytvořeno
                  </p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleString("cs-CZ")}
                  </p>
                </div>
                <div>
                  <p className="text-orders-fg-secondary text-orders-sm">
                    Poslední aktualizace
                  </p>
                  <p className="font-medium">
                    {new Date(order.updated_at).toLocaleString("cs-CZ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
