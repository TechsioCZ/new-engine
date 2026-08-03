import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Label } from "@techsio/ui-kit/atoms/label"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
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
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const shippingExclTaxLabel = shippingLabel
    ? tCheckout("shipping_excl_tax_with_name", { shippingName: shippingLabel })
    : tCart("shipping_excl_tax")

  return (
    <section className="w-full space-y-300 xl:max-w-header-search">
      <div className="rounded-sm bg-surface shadow-md">
        <div className="flex flex-col gap-450 px-400 pt-550 pb-450 md:px-550">
          <CheckoutSelectPromoCode />
          <div>
            <div className="space-y-150 pb-150">
              <div className="flex items-center justify-between">
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {tCart("products_subtotal_excl_tax")}
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
                  {tCart("tax")}
                </p>
                <p className="font-normal text-fg-primary text-sm leading-relaxed">
                  {formatCurrencyAmount(cartTaxAmount, currencyCode)}
                </p>
              </div>
            </div>

            <div className="mt-150 flex items-start justify-between gap-300 border-border-secondary border-t pt-350">
              <p className="font-normal text-fg-primary text-sm leading-relaxed">
                {tCart("total_incl_tax")}
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
              {tCheckout("continue_to_shipping_payment")}
            </span>
          </LinkButton>
        </div>
      </div>

      <div className="space-y-500">
        <CheckoutSelectBenefits />
        <div className="flex flex-col gap-150">
          <Label className="font-medium text-sm">
            {tCheckout("save_cart_for_later")}
          </Label>
          <div className="flex gap-300">
            <Button
              className="h-full border-2 border-border-primary px-400 py-300"
              disabled
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <Icon icon="token-icon-copy" />
              <span>{tCheckout("save_cart_link")}</span>
            </Button>
            <Button
              className="h-full border-2 border-border-primary px-400 py-300"
              disabled
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <Icon icon="token-icon-send" />
              <span>{tCheckout("send_cart_email")}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
