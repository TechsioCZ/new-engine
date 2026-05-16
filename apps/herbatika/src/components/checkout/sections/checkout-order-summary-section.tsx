import type { HttpTypes } from "@medusajs/types";
import NextImage from "next/image";
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants";
import { SupportingText } from "@/components/text/supporting-text";
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { resolveAvailabilityText } from "../utils/resolve-availability-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { CheckoutSelectBenefits } from "../checkout-select-benefits";

type CheckoutOrderSummarySectionProps = {
  cartItems: HttpTypes.StoreCartLineItem[];
  cartItemsTotalAmount: number;
  cartTotalAmount: number;
  cartTotalWithoutTaxAmount: number;
  currencyCode: string;
  detailsFont: "inter" | "rubik";
  paymentLabel?: string;
  shippingLabel?: string;
  shippingAmount: number;
};

export function CheckoutOrderSummarySection({
  cartItems,
  cartItemsTotalAmount,
  cartTotalAmount,
  cartTotalWithoutTaxAmount,
  currencyCode,
  detailsFont,
  paymentLabel,
  shippingLabel,
  shippingAmount,
}: CheckoutOrderSummarySectionProps) {
  const detailsFontClass =
    detailsFont === "inter" ? "font-inter" : "font-rubik";

  return (
    <section className={`space-y-300 rounded-sm p-550 ${detailsFontClass}`}>
      <header>
        <h2 className="text-xl font-medium text-fg-primary">{`Váš košík (${cartItems.length})`}</h2>
      </header>

      <div className="space-y-250">
        {cartItems.length > 0 ? (
          cartItems.map((item, index) => {
            const itemName = resolveCartItemName(item);
            const itemQuantity = item.quantity ?? 0;
            const itemPrice = formatCurrencyAmount(
              resolveLineItemTotalAmount(item),
              currencyCode,
            );
            const itemThumbnail =
              typeof item.thumbnail === "string" && item.thumbnail.length > 0
                ? item.thumbnail
                : FALLBACK_IMAGE_SRC;
            const hasDivider = index < cartItems.length - 1;
            const availabilityText = resolveAvailabilityText(item);

            return (
              <article
                className={`flex items-start gap-300 pb-250 ${
                  hasDivider ? "border-b border-border-secondary" : ""
                }`}
                key={item.id}
              >
                <NextImage
                  alt={itemName}
                  className="size-checkout-image shrink-0 rounded-sm border border-border-secondary object-cover"
                  height={150}
                  quality={50}
                  src={itemThumbnail}
                  width={150}
                />
                <div className="flex flex-col min-w-0 space-y-100 h-checkout-image justify-between">
                  <p className="line-clamp text-md font-medium text-fg-primary">
                    {itemName}
                  </p>
                  <p className="inline-flex items-end h-full font-medium text-success-fg text-xs leading-normal">
                    <span className="h-fit flex items-center gap-150">
                      <Icon className="shrink-0" icon="token-icon-check" size="sm" />
                      <span className="min-w-0">{availabilityText}</span>
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-100 items-end">
                  <p className="shrink-0 text-lg font-semibold text-fg-primary">
                    {itemPrice}
                  </p>
                  <SupportingText className="text-fg-secondary">{`${itemQuantity} ks`}</SupportingText>
                </div>
              </article>
            );
          })
        ) : (
          <SupportingText className="text-fg-secondary">
            Košík je zatiaľ prázdny.
          </SupportingText>
        )}
      </div>

      <div className="space-y-200 border-t border-border-primary">
        <div className="flex items-center justify-between border-b border-border-primary">
          <span className="text-fg-secondary py-200">Cena produktov</span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(cartItemsTotalAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-border-primary py-200">
          <span className="text-fg-secondary">{shippingLabel || "Doprava"}</span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(shippingAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between py-200">
          <span className="text-fg-secondary">{paymentLabel || "Platební metoda"}</span>
          <p className="text-md font-medium text-success-fg">
            Zadarmo
          </p>
        </div>
        <div className="flex items-start justify-between border-t border-border-primary pt-150">
          <span className="text-md md:mt-150 font-semibold text-fg-primary">
            Spolu s DPH
          </span>
          <div className="flex flex-col items-end gap-200">
            <p className="text-2xl font-bold text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            <span className="text-sm text-fg-secondary">
              {`bez DPH: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
            </span>
          </div>
        </div>
      </div>
      <CheckoutSelectBenefits />
    </section>
  );
}
