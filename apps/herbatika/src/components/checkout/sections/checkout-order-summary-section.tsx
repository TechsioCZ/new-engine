import type { HttpTypes } from "@medusajs/types";
import { Image } from "@techsio/ui-kit/atoms/image";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/components/checkout/checkout.utils";
import { SupportingText } from "@/components/text/supporting-text";

type CheckoutOrderSummarySectionProps = {
  cartItems: HttpTypes.StoreCartLineItem[];
  cartSubtotalAmount: number;
  cartTotalAmount: number;
  currencyCode: string;
  detailsFont: "inter" | "rubik";
  hasPayment: boolean;
  hasShipping: boolean;
  selectedOptionName?: string;
  selectedShippingPrice: number;
};

export function CheckoutOrderSummarySection({
  cartItems,
  cartSubtotalAmount,
  cartTotalAmount,
  currencyCode,
  detailsFont,
  hasPayment,
  hasShipping,
  selectedOptionName,
  selectedShippingPrice,
}: CheckoutOrderSummarySectionProps) {
  const detailsFontClass = detailsFont === "inter" ? "font-inter" : "font-rubik";

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
                : "/file.svg";
            const hasDivider = index < cartItems.length - 1;

            return (
              <article
                className={`flex items-start gap-300 pb-250 ${
                  hasDivider ? "border-b border-border-secondary" : ""
                }`}
                key={item.id}
              >
                <Image
                  alt={itemName}
                  className="h-850 w-850 shrink-0 rounded-sm border border-border-secondary object-cover"
                  src={itemThumbnail}
                />
                <div className="min-w-0 flex-1 space-y-100">
                  <p className="line-clamp-2 text-md font-medium text-fg-primary">{itemName}</p>
                  <SupportingText className="text-fg-secondary">{`× ${itemQuantity}`}</SupportingText>
                </div>
                <p className="shrink-0 text-lg font-semibold text-fg-primary">{itemPrice}</p>
              </article>
            );
          })
        ) : (
          <SupportingText className="text-fg-secondary">
            Košík je zatiaľ prázdny.
          </SupportingText>
        )}
      </div>

      <div className="space-y-150 border-y border-border-primary py-250">
        <div className="flex items-center justify-between gap-200 border-b border-border-primary">
          <span className="text-fg-secondary pb-150">Cena produktov</span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">Doprava</span>
          <p className="text-md font-medium text-fg-primary">
            {formatCurrencyAmount(selectedShippingPrice, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-200 border-t border-border-primary pt-150">
          <span className="text-md font-semibold text-fg-primary">Spolu s DPH</span>
          <div>
          <p className="text-2xl font-bold text-fg-primary">
            {formatCurrencyAmount(cartTotalAmount, currencyCode)}
          </p>
          <span className="text-sm">bez DPH: </span>
          </div>
        </div>
      </div>

      <div className="space-y-100 text-sm text-fg-secondary">
        <p>{hasShipping ? `Doprava: ${selectedOptionName ?? "Zvolená"}` : "Doprava: nevybraná"}</p>
        <p>{hasPayment ? "Platba: vybraná" : "Platba: nevybraná"}</p>
      </div>
    </section>
  );
}
