import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { Select } from "@techsio/ui-kit/molecules/select";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Label } from "@techsio/ui-kit/atoms/label";
import { CheckoutSelectBenefits } from "../checkout-select-benefits";
import { CheckoutSelectPromoCode } from "../checkout-select-promo-code";


type CheckoutCartSidebarSectionProps = {
  cartSubtotalAmount: number;
  cartTotalAmount: number;
  cartTotalWithoutTaxAmount: number;
  currencyCode: string;
  nextStepHref: string;
};

export function CheckoutCartSidebarSection({
  cartSubtotalAmount,
  cartTotalAmount,
  cartTotalWithoutTaxAmount,
  currencyCode,
  nextStepHref,
}: CheckoutCartSidebarSectionProps) {

  
  return (
    <section className="w-full xl:max-w-header-search space-y-300">
      <div className="rounded-sm bg-surface shadow-md">
        <div className="flex flex-col gap-450 px-400 pt-550 pb-450 md:px-550">
          	<CheckoutSelectPromoCode />
          <div>
            <div className="flex items-center justify-between pb-150">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">
                Cena produktov
              </p>
              <p className="text-sm leading-relaxed font-normal text-fg-primary">
                {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
              </p>
            </div>

            <div className="mt-150 flex items-start justify-between gap-300 border-t border-border-secondary pt-350">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">
                Spolu s DPH
              </p>
              <div className="flex flex-col items-end gap-100">
                <p className="text-2xl leading-tight font-bold text-fg-primary">
                  {formatCurrencyAmount(cartTotalAmount, currencyCode)}
                </p>
                <p className="text-xs leading-normal font-normal text-fg-secondary">
                  {`bez DPH: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
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
            <span className="font-normal text-xs sm:text-md">Pokračovať na dopravu a platbu</span>
          </LinkButton>
        </div>
      </div>

      <div className="space-y-500">
        <CheckoutSelectBenefits />
        <div className="flex flex-col gap-150">
          <Label className="text-sm font-[500]">Odložiť si košík na neskôr</Label>
          <div className="flex gap-300">
            <Button theme="outlined" variant="secondary" size="sm" className="px-400 py-300 h-full border-2 border-border-primary">
              <Icon icon="token-icon-copy" />
              <span>Uložiť link</span>
            </Button>
            <Button theme="outlined" variant="secondary" size="sm" className="px-400 py-300 h-full border-2 border-border-primary">
              <Icon icon="token-icon-send" />
              <span>Poslať na e-mail</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
