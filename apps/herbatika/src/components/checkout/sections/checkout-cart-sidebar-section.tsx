import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Label } from "@techsio/ui-kit/atoms/label"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { useCartStorefrontTexts } from "@/lib/storefront/use-cart-storefront-texts"
import {
  resolveCheckoutShippingExclTaxLabel,
  useCheckoutStorefrontTexts,
} from "@/lib/storefront/use-checkout-storefront-texts"
import { CheckoutSelectBenefits } from "../checkout-select-benefits"
import { CheckoutSelectPromoCode } from "../checkout-select-promo-code"

type CheckoutCartSidebarSectionProps = {
  cartItemsTotalAmount: number
  cartTaxAmount: number
  cartTotalAmount: number
  currencyCode: string
  hasShipping: boolean
  nextStepHref: string
  shippingAmount: number
  shippingLabel?: string
}

export function CheckoutCartSidebarSection({
  cartItemsTotalAmount,
  cartTaxAmount,
  cartTotalAmount,
  currencyCode,
  hasShipping,
  nextStepHref,
  shippingAmount,
  shippingLabel,
}: CheckoutCartSidebarSectionProps) {
  const cartTexts = useCartStorefrontTexts()
  const checkoutTexts = useCheckoutStorefrontTexts()
  const shippingExclTaxLabel = resolveCheckoutShippingExclTaxLabel({
    fallback: cartTexts.shippingExclTax,
    shippingName: shippingLabel,
    template: checkoutTexts.shippingExclTaxWithName,
  })

  return (
    <section className="w-full space-y-300 xl:max-w-header-search">
      <div className="rounded-sm bg-surface shadow-md">
        <div className="flex flex-col gap-450 px-400 pt-550 pb-450 md:px-550">
          <CheckoutSelectPromoCode />
          <div>
            <div className="space-y-150 pb-150">
              <div className="flex items-center justify-between">
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {cartTexts.productsSubtotalExclTax}
                </p>
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {formatCurrencyAmount(cartItemsTotalAmount, currencyCode)}
                </p>
              </div>

              {hasShipping ? (
                <div className="flex items-center justify-between">
                  <p className="font-normal text-fg-primary text-sm leading-relaxed">
                    {shippingExclTaxLabel}
                  </p>
                  <p className="font-normal text-fg-primary text-sm leading-relaxed">
                    {formatCurrencyAmount(shippingAmount, currencyCode)}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {cartTexts.tax}
                </p>
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {formatCurrencyAmount(cartTaxAmount, currencyCode)}
                </p>
              </div>
            </div>

            <div className="mt-150 flex items-start justify-between gap-300 border-border-secondary border-t pt-350">
              <p className="font-normal text-fg-primary text-sm leading-relaxed">
                {cartTexts.totalInclTax}
              </p>
              <div className="flex flex-col items-end gap-100">
                <p className="font-bold text-2xl text-fg-primary leading-tight">
                  {formatCurrencyAmount(cartTotalAmount, currencyCode)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-400 pt-150 pb-550 md:px-550">
          <LinkButton
            as={NextLink}
            block
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="lg"
            uppercase
            variant="primary"
          >
            <span className="font-normal text-xs sm:text-md">
              {checkoutTexts.continueToShippingPayment}
            </span>
          </LinkButton>
        </div>
      </div>

      <div className="space-y-500">
        <CheckoutSelectBenefits />
        <div className="flex flex-col gap-150">
          <Label className="font-medium text-sm">
            Odložiť si košík na neskôr
          </Label>
          <div className="flex gap-300">
            <Button
              className="h-full border-2 border-border-primary px-400 py-300"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <Icon icon="token-icon-copy" />
              <span>Uložiť link</span>
            </Button>
            <Button
              className="h-full border-2 border-border-primary px-400 py-300"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <Icon icon="token-icon-send" />
              <span>Poslať na e-mail</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
