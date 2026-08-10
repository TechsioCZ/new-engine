import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

import { SupportingText } from "@/components/text/supporting-text"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

import { CheckoutSelectBenefits } from "../checkout-select-benefits"
import { CheckoutOrderSummaryItem } from "./checkout-order-summary-item"

interface CheckoutOrderSummarySectionProps {
  cartItems: HttpTypes.StoreCartLineItem[]
  cartItemsWithoutTaxAmount: number
  cartTaxAmount: number
  cartTotalAmount: number
  currencyCode: string
  detailsFont: "inter" | "rubik"
  paymentLabel?: string
  shippingLabel?: string
  shippingAmount: number
}

export const CheckoutOrderSummarySection = ({
  cartItems,
  cartItemsWithoutTaxAmount,
  cartTaxAmount,
  cartTotalAmount,
  currencyCode,
  detailsFont,
  paymentLabel,
  shippingLabel,
  shippingAmount,
}: CheckoutOrderSummarySectionProps) => {
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const detailsFontClass = detailsFont === "inter" ? "font-inter" : "font-rubik"
  const shippingExclTaxLabel =
    shippingLabel === undefined || shippingLabel.length === 0
      ? tCart("shipping_excl_tax")
      : tCheckout("shipping_excl_tax_with_name", {
          shippingName: shippingLabel,
        })

  return (
    <section className={`space-y-300 rounded-sm sm:p-550 ${detailsFontClass}`}>
      <header>
        <h2 className="font-medium text-fg-primary text-xl leading-relaxed">
          {tCart("title_with_count", {
            count: cartItems.length,
          })}
        </h2>
      </header>

      <div className="space-y-250">
        {cartItems.length > 0 ? (
          cartItems.map((item, index) => (
            <CheckoutOrderSummaryItem
              currencyCode={currencyCode}
              hasDivider={index < cartItems.length - 1}
              item={item}
              key={item.id}
            />
          ))
        ) : (
          <SupportingText className="text-fg-secondary">
            {tCheckout("empty_cart_title")}
          </SupportingText>
        )}
      </div>

      <div className="space-y-200 border-border-primary border-t">
        <div className="flex items-center justify-between border-border-primary border-b">
          <span className="py-200 text-fg-secondary">
            {tCart("products_subtotal_excl_tax")}
          </span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(cartItemsWithoutTaxAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-border-primary border-b py-200">
          <span className="text-fg-secondary">{shippingExclTaxLabel}</span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(shippingAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-border-primary border-b py-200">
          <span className="text-fg-secondary">{tCart("tax")}</span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(cartTaxAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between py-200">
          <span className="text-fg-secondary">
            {paymentLabel !== undefined && paymentLabel.length > 0
              ? paymentLabel
              : tCheckout("payment")}
          </span>
          <p className="font-medium text-md text-success-fg">
            {tCheckout("free")}
          </p>
        </div>
        <div className="flex items-start justify-between border-border-primary border-t pt-150">
          <span className="font-semibold text-fg-primary text-md md:mt-150">
            {tCart("total_incl_tax")}
          </span>
          <div className="flex flex-col items-end gap-200">
            <p className="font-bold text-2xl text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
          </div>
        </div>
      </div>
      <CheckoutSelectBenefits />
    </section>
  )
}
