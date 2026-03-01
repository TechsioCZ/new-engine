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
    <section className="checkout-cart-sidebar space-y-550">
      <div className="checkout-cart-sidebar-card">
        <div className="checkout-cart-sidebar-inner">
          <Button
            className="checkout-cart-sidebar-select-row"
            size="md"
            theme="unstyled"
            type="button"
            variant="secondary"
          >
            <span className="checkout-cart-sidebar-select-label">
              <Icon className="text-lg text-fg-primary" icon="icon-[mdi--tag-outline]" />
              Zadať zľavový kód
            </span>
            <Icon className="text-lg text-fg-primary" icon="icon-[mdi--chevron-down]" />
          </Button>

          <div className="checkout-cart-sidebar-prices">
            <div className="checkout-cart-sidebar-price-row">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">Cena produktov</p>
              <p className="text-sm leading-relaxed font-normal text-fg-primary">
                {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
              </p>
            </div>

            <div className="checkout-cart-sidebar-total-row">
              <p className="text-sm leading-relaxed font-normal text-fg-primary">Spolu s DPH</p>
              <div className="checkout-cart-sidebar-total-value">
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

        <div className="checkout-cart-sidebar-cta-shell">
          <LinkButton
            as={NextLink}
            className="checkout-cart-sidebar-cta"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="lg"
            variant="primary"
          >
            Pokračovať na dopravu a platbu
          </LinkButton>
        </div>
      </div>

      <div className="space-y-200">
        <h3 className="checkout-cart-sidebar-heading">Benefity</h3>
        <Button
          className="checkout-cart-sidebar-select-row"
          size="md"
          theme="unstyled"
          type="button"
          variant="secondary"
        >
          <span className="checkout-cart-sidebar-select-label">
            <Icon className="text-lg text-fg-primary" icon="icon-[mdi--cash-refund]" />
            Vrátenie do 14 dní zadarmo
          </span>
          <Icon className="text-lg text-fg-primary" icon="icon-[mdi--chevron-down]" />
        </Button>
      </div>

      <div className="space-y-200">
        <h3 className="checkout-cart-sidebar-heading">Odložiť si košík na neskôr</h3>

        <div className="checkout-cart-sidebar-actions">
          <Button
            className="checkout-cart-sidebar-secondary-btn"
            size="md"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            <Icon className="text-xs text-fg-primary" icon="icon-[mdi--content-copy]" />
            Uložiť link
          </Button>

          <Button
            className="checkout-cart-sidebar-secondary-btn"
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
