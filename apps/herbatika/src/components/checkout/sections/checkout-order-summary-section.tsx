import type { HttpTypes } from "@medusajs/types";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Image } from "@techsio/ui-kit/atoms/image";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/components/checkout/checkout.utils";

type CheckoutOrderSummarySectionProps = {
  cartItems: HttpTypes.StoreCartLineItem[];
  cartSubtotalAmount: number;
  cartTotalAmount: number;
  currencyCode: string;
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
  hasPayment,
  hasShipping,
  selectedOptionName,
  selectedShippingPrice,
}: CheckoutOrderSummarySectionProps) {
  return (
    <section className="checkout-card space-y-250 p-550">
      <header className="flex items-center justify-between gap-200">
        <h2 className="text-xl font-medium text-fg-primary">{`Váš košík (${cartItems.length})`}</h2>
        <span className="rounded-full bg-primary px-200 py-100 text-xs font-medium text-fg-reverse">
          Aktívny
        </span>
      </header>

      <div className="space-y-250">
        {cartItems.length > 0 ? cartItems.map((item) => {
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

          return (
            <article
              className="flex gap-300 rounded-sm border border-border-primary bg-surface p-250"
              key={item.id}
            >
              <Image
                alt={itemName}
                className="checkout-summary-thumb shrink-0 rounded-sm border border-border-secondary object-cover"
                src={itemThumbnail}
              />
              <div className="min-w-0 flex-1 space-y-100">
                <p className="line-clamp-2 text-sm font-medium text-fg-primary">{itemName}</p>
                <div className="flex items-center justify-between gap-150">
                  <ExtraText className="text-fg-secondary">{`× ${itemQuantity}`}</ExtraText>
                  <p className="text-sm font-semibold text-fg-primary">{itemPrice}</p>
                </div>
              </div>
            </article>
          );
        }) : (
          <ExtraText className="text-fg-secondary">
            Košík je zatiaľ prázdny.
          </ExtraText>
        )}
      </div>

      <div className="space-y-150 border-t border-border-primary pt-250">
        <div className="flex items-center justify-between gap-200">
          <ExtraText className="text-fg-secondary">Medzisúčet</ExtraText>
          <p className="text-sm font-semibold text-fg-primary">
            {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-200">
          <ExtraText className="text-fg-secondary">Doprava</ExtraText>
          <p className="text-sm font-semibold text-fg-primary">
            {formatCurrencyAmount(selectedShippingPrice, currencyCode)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-200 border-t border-border-primary pt-150">
          <p className="text-sm font-semibold text-fg-primary">Celkom</p>
          <p className="text-lg font-bold text-fg-primary">
            {formatCurrencyAmount(cartTotalAmount, currencyCode)}
          </p>
        </div>
      </div>

      <div className="space-y-100 border-t border-border-secondary pt-200 text-xs text-fg-secondary">
        <p>{hasShipping ? `Doprava: ${selectedOptionName ?? "Zvolená"}` : "Doprava: nevybraná"}</p>
        <p>{hasPayment ? "Platba: vybraná" : "Platba: nevybraná"}</p>
      </div>
    </section>
  );
}
