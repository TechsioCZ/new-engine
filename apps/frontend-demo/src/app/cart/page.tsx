"use client"

import { Button } from "@ui/atoms/button"
import { BreadcrumbTemplate } from "@ui/templates/breadcrumb"
import { NumericInputTemplate } from "@ui/templates/numeric-input"
import Image from "next/image"
import Link from "next/link"
import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { CartSummary } from "@/components/cart/cart-summary"
import { EmptyCart } from "@/components/cart/empty-cart"
import { useCart } from "@/hooks/use-cart"
import { truncateProductTitle } from "@/lib/order-utils"
import { orderHelpers } from "@/stores/order-store"
import { formatPrice } from "@/utils/price-utils"
import { getProductPath } from "@/utils/product-utils"

export default function CartPage() {
  const { cart, removeItem, updateQuantity, clearCart, isLoading } = useCart()

  const items = cart?.items || []
  const subtotal = cart?.subtotal || 0
  const total = cart?.total || 0
  const currencyCode = cart?.region?.currency_code

  // Use helper to calculate tax properly
  const tax = subtotal * 0.21 // 21% VAT
  const shipping = 0 // Free shipping

  // Clear previous completed order
  orderHelpers.clearCompletedOrder()

  return (
    <div className="min-h-screen bg-cart-bg">
      <div className="mx-auto max-w-cart-max-w px-cart-container-x py-cart-container-y lg:px-cart-container-x-lg lg:py-cart-container-y-lg">
        {/* Breadcrumb */}
        <div className="mb-cart-breadcrumb-margin">
          <BreadcrumbTemplate
            items={[
              { label: "Domů", href: "/" },
              { label: "Košík", href: "/cart" },
            ]}
            linkAs={Link}
          />
        </div>

        <div className="mb-400 flex items-center justify-between gap-400">
          <h1 className="font-cart-title text-cart-title-size">
            Nákupní košík
          </h1>
          {/* Clear cart button */}
          <Button
            icon="token-icon-remove-all"
            onClick={clearCart}
            size="sm"
            theme="borderless"
            variant="tertiary"
          >
            Vyprázdnit košík
          </Button>
        </div>

        {isLoading || !cart ? (
          <div className="space-y-4">
            <SkeletonLoader className="h-32 w-full" variant="box" />
            <SkeletonLoader className="h-32 w-full" variant="box" />
            <SkeletonLoader className="h-32 w-full" variant="box" />
          </div>
        ) : items.length > 0 ? (
          <div className="lg:grid lg:grid-cols-cart-grid-cols lg:gap-cart-grid-gap">
            <div className="mb-cart-items-margin lg:mb-0">
              <div className="divide-y divide-cart-item-divider">
                {items.map((item) => {
                  const price = item.unit_price || 0

                  return (
                    <div
                      className="py-cart-item-y first:pt-0 last:pb-0"
                      key={item.id}
                    >
                      <div className="flex gap-cart-item-gap">
                        <div className="h-cart-item-image w-cart-item-image rounded-cart-item-image bg-cart-item-image-bg">
                          {item.thumbnail && (
                            <Image
                              alt={item.title}
                              className="h-full w-full rounded-cart-item-image object-cover"
                              height={120}
                              src={item.thumbnail}
                              width={120}
                            />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="mb-cart-item-header-margin flex items-start justify-between">
                            <div className="flex items-end gap-300 text-cart-item-title-size">
                              <Link
                                href={getProductPath(item.product_handle || "")}
                              >
                                <h3 className="font-cart-item-title text-tertiary hover:text-cart-item-title">
                                  {`${truncateProductTitle(item.title)} (${item.variant_title})`}
                                </h3>
                              </Link>
                              <p className="font-cart-item-price text-cart-item-price">
                                {formatPrice(price, currencyCode)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-cart-item-actions-gap sm:flex-row sm:items-center">
                            <NumericInputTemplate
                              className="h-fit w-24 py-0"
                              max={99}
                              min={1}
                              onChange={(value) =>
                                updateQuantity(item.id, value)
                              }
                              size="sm"
                              value={item.quantity}
                            />
                            <Button
                              icon="token-icon-remove"
                              onClick={() => removeItem(item.id)}
                              size="sm"
                              theme="borderless"
                              variant="tertiary"
                            >
                              Odebrat
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <CartSummary
              currencyCode={currencyCode}
              shipping={shipping}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>
    </div>
  )
}
