import type { HttpTypes } from "@medusajs/types"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import NextImage from "next/image"
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
import { SupportingText } from "@/components/text/supporting-text"
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { formatStorefrontText } from "@/lib/storefront/storefront-texts"
import { useCartStorefrontTexts } from "@/lib/storefront/use-cart-storefront-texts"
import {
  resolveCheckoutShippingExclTaxLabel,
  useCheckoutStorefrontTexts,
} from "@/lib/storefront/use-checkout-storefront-texts"
import { CheckoutSelectBenefits } from "../checkout-select-benefits"
import { resolveAvailabilityText } from "../utils/resolve-availability-text"

type CheckoutOrderSummarySectionProps = {
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

export function CheckoutOrderSummarySection({
  cartItems,
  cartItemsWithoutTaxAmount,
  cartTaxAmount,
  cartTotalAmount,
  currencyCode,
  detailsFont,
  paymentLabel,
  shippingLabel,
  shippingAmount,
}: CheckoutOrderSummarySectionProps) {
  const cartTexts = useCartStorefrontTexts()
  const checkoutTexts = useCheckoutStorefrontTexts()
  const detailsFontClass = detailsFont === "inter" ? "font-inter" : "font-rubik"
  const shippingExclTaxLabel = resolveCheckoutShippingExclTaxLabel({
    fallback: cartTexts.shippingExclTax,
    shippingName: shippingLabel,
    template: checkoutTexts.shippingExclTaxWithName,
  })

  return (
    <section className={`space-y-300 rounded-sm sm:p-550 ${detailsFontClass}`}>
      <header>
        <h2 className="font-medium text-fg-primary text-xl leading-relaxed">
          {formatStorefrontText(cartTexts.titleWithCount, {
            count: cartItems.length,
          })}
        </h2>
      </header>

      <div className="space-y-250">
        {cartItems.length > 0 ? (
          cartItems.map((item, index) => {
            const itemName = resolveCartItemName(item)
            const itemQuantity = item.quantity ?? 0
            const itemPrice = formatCurrencyAmount(
              resolveLineItemTotalAmount(item),
              currencyCode
            )
            const itemThumbnail =
              typeof item.thumbnail === "string" && item.thumbnail.length > 0
                ? item.thumbnail
                : FALLBACK_IMAGE_SRC
            const hasDivider = index < cartItems.length - 1
            const availabilityText = resolveAvailabilityText(item)

            return (
              <article
                className={`space-y-150 pb-250 ${
                  hasDivider ? "border-border-secondary border-b" : ""
                }`}
                key={item.id}
              >
                <div className="flex items-start gap-300">
                  <NextImage
                    alt={itemName}
                    className="size-checkout-image shrink-0 rounded-sm border border-border-secondary object-cover"
                    height={150}
                    quality={50}
                    src={itemThumbnail}
                    width={150}
                  />
                  <div className="flex h-checkout-image min-w-0 flex-col justify-between space-y-100">
                    <p className="line-clamp font-medium text-fg-primary text-md">
                      {itemName}
                    </p>
                    <p className="2xs:inline-flex hidden h-full w-full items-end font-medium text-success-fg text-xs leading-normal">
                      <span className="flex h-fit items-center gap-150">
                        <Icon
                          className="shrink-0"
                          icon="token-icon-check"
                          size="sm"
                        />
                        <span className="min-w-0">{availabilityText}</span>
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-100">
                    <p className="shrink-0 font-semibold text-fg-primary text-lg">
                      {itemPrice}
                    </p>
                    <SupportingText className="text-fg-secondary">
                      {formatStorefrontText(checkoutTexts.itemQuantity, {
                        quantity: itemQuantity,
                      })}
                    </SupportingText>
                  </div>
                </div>
                <p className="inline-flex 2xs:hidden w-full items-start gap-150 font-medium text-success-fg text-xs leading-normal">
                  <Icon
                    className="shrink-0"
                    icon="token-icon-check"
                    size="sm"
                  />
                  <span className="min-w-0 break-words">
                    {availabilityText}
                  </span>
                </p>
              </article>
            )
          })
        ) : (
          <SupportingText className="text-fg-secondary">
            {cartTexts.emptyTitle}
          </SupportingText>
        )}
      </div>

      <div className="space-y-200 border-border-primary border-t">
        <div className="flex items-center justify-between border-border-primary border-b">
          <span className="py-200 text-fg-secondary">
            {cartTexts.productsSubtotalExclTax}
          </span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(cartItemsWithoutTaxAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-border-primary border-b py-200">
          <span className="text-fg-secondary">
            {shippingExclTaxLabel}
          </span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(shippingAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-border-primary border-b py-200">
          <span className="text-fg-secondary">{cartTexts.tax}</span>
          <p className="font-medium text-fg-primary text-md">
            {formatCurrencyAmount(cartTaxAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between py-200">
          <span className="text-fg-secondary">
            {paymentLabel || checkoutTexts.payment}
          </span>
          <p className="font-medium text-md text-success-fg">
            {checkoutTexts.free}
          </p>
        </div>
        <div className="flex items-start justify-between border-border-primary border-t pt-150">
          <span className="font-semibold text-fg-primary text-md md:mt-150">
            {cartTexts.totalInclTax}
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
