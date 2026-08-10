import { Button } from "@techsio/ui-kit/atoms/button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import NextLink from "@/components/app-link"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

const inlineLinkClassName =
  "text-fg-primary underline underline-offset-2 hover:text-primary"
const renderPrivacyLink = (chunks: ReactNode) => (
  <NextLink className={inlineLinkClassName} href="/#ochrana-osobnych-udajov">
    {chunks}
  </NextLink>
)
const renderTermsLink = (chunks: ReactNode) => (
  <NextLink className={inlineLinkClassName} href="/#obchodne-podmienky">
    {chunks}
  </NextLink>
)

interface CheckoutCompleteOrderCardProps {
  canCompleteOrder: boolean
  cartTaxAmount: number
  cartTotalAmount: number
  cartTotalWithoutTaxAmount: number
  currencyCode: string
  heurekaConsent: boolean
  isCompletingOrder: boolean
  marketingConsent: boolean
  onCompleteOrder: () => Promise<void>
  onHeurekaConsentChange: (value: boolean) => void
  onMarketingConsentChange: (value: boolean) => void
}

export const CheckoutCompleteOrderCard = ({
  canCompleteOrder,
  cartTaxAmount,
  cartTotalAmount,
  cartTotalWithoutTaxAmount,
  currencyCode,
  heurekaConsent,
  isCompletingOrder,
  marketingConsent,
  onCompleteOrder,
  onHeurekaConsentChange,
  onMarketingConsentChange,
}: CheckoutCompleteOrderCardProps) => {
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")

  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
      <div className="flex items-start justify-between gap-200 border-border-secondary border-b pb-250">
        <p className="mt-200 font-medium text-fg-primary text-sm">
          {tCart("total_incl_tax")}
        </p>
        <div className="space-y-200 text-right">
          <p className="font-bold font-rubik text-2xl text-fg-primary">
            {formatCurrencyAmount(cartTotalAmount, currencyCode)}
          </p>
          <SupportingText className="text-fg-secondary">
            {`${tCheckout("total_excl_tax")}: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
          </SupportingText>
          <SupportingText className="text-fg-secondary">
            {`${tCart("tax")}: ${formatCurrencyAmount(cartTaxAmount, currencyCode)}`}
          </SupportingText>
        </div>
      </div>
      <div className="space-y-100 px-150">
        <FormCheckbox
          checked={marketingConsent}
          label={tCheckout("review_marketing_consent")}
          onCheckedChange={onMarketingConsentChange}
          size="sm"
        />
        <FormCheckbox
          checked={heurekaConsent}
          label={tCheckout("review_heureka_consent")}
          onCheckedChange={onHeurekaConsentChange}
          size="sm"
        />
      </div>
      <div className="space-y-200">
        <Button
          block
          className="font-rubik tracking-wide"
          disabled={!canCompleteOrder}
          icon="token-icon-chevron-right"
          iconPosition="right"
          isLoading={isCompletingOrder}
          onClick={() => {
            runDetachedPromise(onCompleteOrder())
          }}
          size="lg"
          type="button"
          uppercase
        >
          {tCheckout("complete_order")}
        </Button>
        <p className="mx-auto max-w-checkout-legal text-center text-fg-secondary text-xs leading-relaxed">
          {tCheckout.rich("review_legal_confirmation", {
            privacy: renderPrivacyLink,
            terms: renderTermsLink,
          })}
        </p>
      </div>
    </section>
  )
}
