"use client"

import type { HttpTypes } from "@medusajs/types"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { resolveLineItemProductHandle } from "@/components/header/herbatika-cart-item.utils"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { resolveFreeShippingThresholdAmount } from "@/lib/storefront/free-shipping"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/products"
import { useCartLineItemActions } from "@/lib/storefront/use-cart-line-item-actions"

import { useCartProductsByHandle } from "../use-cart-products-by-handle"
import { CheckoutCartItemRow } from "./checkout-cart-item-row"

const renderStrongText = (chunks: ReactNode) => (
  <span className="font-semibold">{chunks}</span>
)

interface CheckoutCartStepSectionProps {
  cartId?: string
  cartItems: HttpTypes.StoreCartLineItem[]
  cartItemsTotalAmount: number
  currencyCode: string
}

export const CheckoutCartStepSection = ({
  cartId,
  cartItems,
  cartItemsTotalAmount,
  currencyCode,
}: CheckoutCartStepSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const lineItemActions = useCartLineItemActions(
    cartId === undefined ? {} : { cartId },
  )
  const { productsByHandle: cartProductsByHandle } = useCartProductsByHandle(
    cartItems,
    PRODUCT_DETAIL_FIELDS,
  )

  const supportedCurrencyCode = resolveSupportedCurrencyCode(currencyCode)
  const freeShippingThresholdAmount = resolveFreeShippingThresholdAmount(
    supportedCurrencyCode,
  )
  const missingAmount =
    freeShippingThresholdAmount === null
      ? 0
      : Math.max(freeShippingThresholdAmount - cartItemsTotalAmount, 0)
  const progressValue =
    freeShippingThresholdAmount === null
      ? 0
      : Math.min(
          (cartItemsTotalAmount / freeShippingThresholdAmount) * 100,
          100,
        )
  const missingAmountLabel =
    freeShippingThresholdAmount === null
      ? null
      : formatCurrencyAmount(missingAmount, supportedCurrencyCode)
  const freeShippingTargetLabel =
    freeShippingThresholdAmount === null
      ? null
      : formatCurrencyAmount(
          freeShippingThresholdAmount,
          supportedCurrencyCode,
          { maximumFractionDigits: 0, minimumFractionDigits: 0 },
        )

  return (
    <section className="space-y-300">
      {freeShippingThresholdAmount === null ? null : (
        <div className="min-h-900 rounded-sm border border-border-primary bg-surface px-400 pt-400 pb-650 md:px-550">
          <p className="text-center font-light text-fg-primary text-sm leading-relaxed">
            {missingAmount > 0
              ? tCheckout.rich("free_shipping_remaining", {
                  missingAmount: missingAmountLabel ?? "",
                  strong: renderStrongText,
                })
              : tCheckout("free_shipping_qualified")}
          </p>

          <div className="relative mt-400 flex items-start">
            <div className="relative mt-350 h-100 flex-1 overflow-hidden rounded-xs bg-border-primary">
              <progress
                aria-label={tCheckout("free_shipping_progress_aria")}
                className="sr-only"
                max={100}
                value={progressValue}
              />
              <div
                aria-hidden
                className="h-full origin-left rounded-xs bg-success transition-transform duration-300 ease-out"
                style={{ transform: `scaleX(${progressValue / 100})` }}
              />
            </div>

            <div className="-translate-x-3 flex min-w-700 flex-col items-center gap-50">
              <span className="inline-flex h-700 w-700 items-center justify-center rounded-full border border-border-primary bg-overlay">
                <Icon
                  className="text-fg-secondary"
                  icon="token-icon-truck-delivery"
                  size="lg"
                />
              </span>
              <span className="text-fg-primary text-sm">
                {freeShippingTargetLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-border-primary bg-surface p-400 md:px-550 md:pt-550 md:pb-500">
        {cartItems.map((item, index) => {
          const itemProduct = cartProductsByHandle.get(
            resolveLineItemProductHandle(item) ?? "",
          )

          return (
            <div
              className={`py-250 ${index > 0 ? "border-border-secondary border-t" : ""}`}
              key={item.id}
            >
              <CheckoutCartItemRow
                currencyCode={supportedCurrencyCode}
                isPending={lineItemActions.isPending}
                item={item}
                onRemove={(lineItemId) => {
                  lineItemActions.removeItem(lineItemId)
                }}
                onUpdateQuantity={(lineItemId, quantity) => {
                  lineItemActions.updateQuantity(lineItemId, quantity)
                }}
                {...(itemProduct === undefined ? {} : { product: itemProduct })}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
