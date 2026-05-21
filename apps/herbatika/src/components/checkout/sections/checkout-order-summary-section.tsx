import type { HttpTypes } from "@medusajs/types";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import NextImage from "next/image";
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants";
import { SupportingText } from "@/components/text/supporting-text";
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { CheckoutSelectBenefits } from "../checkout-select-benefits";
import { resolveAvailabilityText } from "../utils/resolve-availability-text";

type CheckoutOrderSummarySectionProps = {
  cartItems: HttpTypes.StoreCartLineItem[];
  cartItemsTotalAmount: number;
  cartItemsWithoutTaxAmount: number;
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
  cartItemsWithoutTaxAmount,  
  cartTotalAmount,
  currencyCode,
  detailsFont,
  paymentLabel,
  shippingLabel,
  shippingAmount,
}: CheckoutOrderSummarySectionProps) {
  const detailsFontClass =
    detailsFont === "inter" ? "font-inter" : "font-rubik";

  return (
    <section className={`space-y-300 rounded-sm sm:p-550 ${detailsFontClass}`}>
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
                className={`space-y-150 pb-250 ${
                  hasDivider ? "border-b border-border-secondary" : ""
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
                    <p className="line-clamp text-md font-medium text-fg-primary">
                      {itemName}
                    </p>
                    <p className="hidden h-full w-full items-end text-xs font-medium leading-normal text-success-fg 2xs:inline-flex">
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
                    <p className="shrink-0 text-lg font-semibold text-fg-primary">
                      {itemPrice}
                    </p>
                    <SupportingText className="text-fg-secondary">{`${itemQuantity} ks`}</SupportingText>
                  </div>
                </div>
                <p className="inline-flex w-full items-start gap-150 text-xs font-medium leading-normal text-success-fg 2xs:hidden">
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
          <span className="text-fg-secondary py-200">Cena produktov bez DPH</span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(cartItemsWithoutTaxAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-border-primary py-200">
          <span className="text-fg-secondary">
            {shippingLabel || "Doprava"}
          </span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(shippingAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between py-200">
          <span className="text-fg-secondary">
            {paymentLabel || "Platební metoda"}
          </span>
          <p className="text-md font-medium text-success-fg">Zadarmo</p>
        </div>
        <div className="flex items-start justify-between border-t border-border-primary pt-150">
          <span className="text-md md:mt-150 font-semibold text-fg-primary">
            Spolu s DPH
          </span>
          <div className="flex flex-col items-end gap-200">
            <p className="text-2xl font-bold text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            {/* <span className="text-sm text-fg-secondary">
              {`bez DPH: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
            </span> */}
          </div>
        </div>
      </div>
      <CheckoutSelectBenefits />
    </section>
  );
}
