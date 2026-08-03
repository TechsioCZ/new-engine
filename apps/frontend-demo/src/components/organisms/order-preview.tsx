"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import Image from "next/image"

import { useCart } from "@/hooks/use-cart"
import { formatPrice } from "@/lib/format-price"
import { orderHelpers } from "@/stores/order-store"

interface OrderPreviewProps {
  shippingPrice?: number
  paymentFee?: number
  showDetails?: boolean
  className?: string
}

export function OrderPreview({
  shippingPrice = 0,
  paymentFee = 0,
  showDetails = true,
  className = "",
}: OrderPreviewProps) {
  const { cart } = useCart()

  // Use order data from store or current cart
  const orderData = orderHelpers.getOrderData(cart)

  if (!orderData) {
    return null
  }

  const finalTotal = orderData.total + paymentFee

  return (
    <div className={`rounded-lg p-4 sm:p-6 ${className}`}>
      <h3 className="mb-3 font-semibold text-fg-primary sm:mb-4 sm:text-lg">
        Souhrn objednávky
      </h3>

      {showDetails && orderData.items && orderData.items.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 border-gray-200 border-b pb-3 sm:mb-4 sm:gap-3 sm:pb-4 dark:border-gray-700">
          {orderData.items.map((cartItem) => (
            <div
              className="grid grid-cols-[auto_1fr_auto] items-start gap-2 sm:gap-3"
              key={cartItem.id}
            >
              {cartItem.thumbnail && (
                <div className="h-[48px] w-[48px] flex-shrink-0 sm:h-[60px] sm:w-[60px]">
                  <Image
                    alt={cartItem.title}
                    className="rounded-md object-cover"
                    height={60}
                    src={cartItem.thumbnail}
                    width={60}
                  />
                </div>
              )}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <div className="font-medium text-fg-primary text-xs sm:text-sm">
                  {cartItem.title} ({cartItem.variant_title})
                </div>
                {cartItem.variant && (
                  <div className="text-fg-secondary text-xs">
                    {cartItem.variant.title}
                  </div>
                )}
                <div className="text-fg-secondary text-xs">
                  Množství: {cartItem.quantity}
                </div>
              </div>
              <div className="font-medium text-fg-primary text-xs sm:text-sm">
                {formatPrice(cartItem.unit_price * cartItem.quantity)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 sm:gap-2">
        <div className="flex items-center justify-between text-fg-secondary text-xs sm:text-sm">
          <span>Mezisoučet</span>
          <span>{formatPrice(orderData.original_item_subtotal)}</span>
        </div>

        {orderData.discount_total > 0 && (
          <div className="flex items-center justify-between text-success text-xs sm:text-sm">
            <span>Sleva</span>
            <span>-{formatPrice(orderData.discount_total)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-fg-secondary text-xs sm:text-sm">
          <span>DPH (21%)</span>
          <span>{formatPrice(orderData.original_item_tax_total)}</span>
        </div>

        <div className="flex items-center justify-between text-fg-secondary text-xs sm:text-sm">
          <span>Doprava</span>
          <span>
            {shippingPrice > 0
              ? formatPrice(orderData.shipping_total)
              : "Zdarma"}
          </span>
        </div>

        {paymentFee > 0 && (
          <div className="flex items-center justify-between text-fg-secondary text-xs sm:text-sm">
            <span>Poplatek za platbu</span>
            <span>{formatPrice(paymentFee)}</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-gray-200 border-t-2 py-2 pt-3 font-semibold text-fg-primary text-md sm:py-3 sm:pt-4 dark:border-gray-700">
          <span>Celkem</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-gray-200 border-t pt-3 text-success sm:mt-4 sm:gap-2 sm:pt-4 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Icon className="text-sm" icon="token-icon-lock" />
          <span>Zabezpečená platba</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Icon className="text-sm" icon="token-icon-check-decagram" />
          <span>100% garance kvality</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Icon className="text-sm" icon="token-icon-back" />
          <span>30denní garance vrácení peněz</span>
        </div>
      </div>
    </div>
  )
}
