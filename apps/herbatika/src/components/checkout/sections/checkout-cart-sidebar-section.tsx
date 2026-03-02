import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

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
    <section className="w-full space-y-550 xl:max-w-header-search">
      <div className="rounded-sm bg-surface shadow-md">
        <div className="flex flex-col gap-450 px-400 pt-550 pb-450 md:px-550">
          <Button
            className="min-h-800 w-full items-center justify-between border border-border-primary bg-overlay px-400 py-300"
            size="md"
            theme="unstyled"
            type="button"
            variant="secondary"
          >
            <span className="inline-flex items-center gap-200 text-sm leading-relaxed font-normal text-fg-primary">
              <Icon className="text-lg text-fg-primary" icon="icon-[mdi--tag-outline]" />
              Zadať zľavový kód
            </span>
            <Icon className="text-lg text-fg-primary" icon="icon-[mdi--chevron-down]" />
          </Button>

          <div className="border-t border-border-secondary">
            <div className="flex items-center justify-between pt-350 pb-150">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">Cena produktov</p>
              <p className="text-sm leading-relaxed font-normal text-fg-primary">
                {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
              </p>
            </div>

            <div className="mt-150 flex items-start justify-between gap-300 border-t border-border-secondary pt-350">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">Spolu s DPH</p>
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
            className="py-300"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="lg"
            uppercase
            variant="primary"
          >
            Pokračovať na dopravu a platbu
          </LinkButton>
        </div>
      </div>

      <div className="space-y-200">
        <h3 className="text-md leading-snug font-medium text-fg-primary">Benefity</h3>
        <Button
          className="min-h-800 w-full items-center justify-between border border-border-primary bg-overlay px-400 py-300"
          size="md"
          theme="unstyled"
          type="button"
          variant="secondary"
        >
          <span className="inline-flex items-center gap-200 text-sm leading-relaxed font-normal text-fg-primary">
            <Icon className="text-lg text-fg-primary" icon="icon-[mdi--cash-refund]" />
            Vrátenie do 14 dní zadarmo
          </span>
          <Icon className="text-lg text-fg-primary" icon="icon-[mdi--chevron-down]" />
        </Button>
      </div>

      <div className="space-y-200">
        <h3 className="text-md leading-snug font-medium text-fg-primary">Odložiť si košík na neskôr</h3>

        <div className="flex flex-wrap gap-200">
          <Button
            className="min-h-750 gap-150 border border-border-primary bg-surface px-300 text-fg-primary"
            size="md"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            <Icon className="text-xs text-fg-primary" icon="icon-[mdi--content-copy]" />
            Uložiť link
          </Button>

          <Button
            className="gap-150 border border-border-primary bg-surface px-300 text-fg-primary"
            size="md"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            <Icon className="text-xs text-fg-primary" icon="icon-[mdi--send-outline]" />
            Poslať na e-mail
          </Button>
        </div>
      </div>
    </section>
  );
}
