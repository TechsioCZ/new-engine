"use client"

import type { HttpTypes } from "@medusajs/types"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { resolveLineItemProductHandle } from "@/components/header/herbatika-cart-item.utils"
import { useAppToast } from "@/hooks/use-app-toast"
import { useRemoveLineItem, useUpdateLineItem } from "@/lib/storefront/cart"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { resolveFreeShippingThresholdAmount } from "@/lib/storefront/free-shipping"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/products"
import { useCartProductsByHandle } from "../use-cart-products-by-handle"
import { CheckoutCartItemRow } from "./checkout-cart-item-row"

type CheckoutCartStepSectionProps = {
  cartId?: string
  cartItems: HttpTypes.StoreCartLineItem[]
  cartItemsTotalAmount: number
  currencyCode: string
}

export function CheckoutCartStepSection({
  cartId,
  cartItems,
  cartItemsTotalAmount,
  currencyCode,
}: CheckoutCartStepSectionProps) {
  const toast = useAppToast()
  const updateLineItemMutation = useUpdateLineItem()
  const removeLineItemMutation = useRemoveLineItem()
  const { productsByHandle: cartProductsByHandle } = useCartProductsByHandle(
    cartItems,
    PRODUCT_DETAIL_FIELDS
  )

  const isPending =
    updateLineItemMutation.isPending || removeLineItemMutation.isPending
  const supportedCurrencyCode = resolveSupportedCurrencyCode(currencyCode)
  const freeShippingThresholdAmount = resolveFreeShippingThresholdAmount(
    supportedCurrencyCode
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
          100
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
          { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        )

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    if (!cartId) {
      return
    }

    updateLineItemMutation.mutate(
      { cartId, lineItemId, quantity },
      {
        onError: (error) => {
          toast.error({
            title: resolveErrorMessage(error, "Úprava košíka zlyhala."),
          })
        },
      }
    )
  }

  const handleRemove = (lineItemId: string) => {
    if (!cartId) {
      return
    }

    removeLineItemMutation.mutate(
      { cartId, lineItemId },
      {
        onError: (error) => {
          toast.error({
            title: resolveErrorMessage(error, "Odstránenie položky zlyhalo."),
          })
        },
      }
    )
  }

  return (
    <section className="space-y-300">
      {freeShippingThresholdAmount !== null ? (
        <div className="min-h-900 rounded-sm border border-border-primary bg-surface px-400 pt-400 pb-650 md:px-550">
          <p className="text-center font-light text-fg-primary text-sm leading-relaxed">
            {missingAmount > 0 ? (
              <>
                {`Nakúpte ešte za ${missingAmountLabel} a získajte `}
                <span className="font-semibold">dopravu zadarmo.</span>
              </>
            ) : (
              "Dopravu zadarmo už máte v košíku."
            )}
          </p>

          <div className="relative mt-400 flex items-start">
            <div
              aria-label="Priebeh do dopravy zadarmo"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(progressValue)}
              className="relative mt-350 h-100 flex-1 overflow-hidden rounded-xs bg-border-primary"
              role="progressbar"
            >
              <div
                className="h-full rounded-xs bg-success transition-all duration-300 ease-out"
                style={{ width: `${progressValue}%` }}
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
      ) : null}

      <div className="overflow-hidden rounded-sm border border-border-primary bg-surface p-400 md:px-550 md:pt-550 md:pb-500">
        {cartItems.map((item, index) => (
          <div
            className={`py-250 ${index > 0 ? "border-border-secondary border-t" : ""}`}
            key={item.id}
          >
            <CheckoutCartItemRow
              currencyCode={supportedCurrencyCode}
              isPending={isPending}
              item={item}
              onRemove={handleRemove}
              onUpdateQuantity={handleUpdateQuantity}
              product={cartProductsByHandle.get(
                resolveLineItemProductHandle(item) ?? ""
              )}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
