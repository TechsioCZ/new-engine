import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Image } from "@techsio/ui-kit/atoms/image";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
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
    <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
      <header className="flex items-center justify-between gap-200">
        <h2 className="text-lg font-semibold text-fg-primary">{`Váš košík (${cartItems.length})`}</h2>
        <Badge variant={cartItems.length > 0 ? "success" : "warning"}>
          {cartItems.length > 0 ? "Aktívny" : "Prázdny"}
        </Badge>
      </header>

      <div className="space-y-250">
        {cartItems.map((item) => {
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
              className="flex gap-250 rounded-lg border border-border-secondary bg-surface-secondary p-250"
              key={item.id}
            >
              <Image
                alt={itemName}
                className="size-850 shrink-0 rounded-lg border border-border-secondary object-cover"
                src={itemThumbnail}
              />
              <div className="min-w-0 flex-1 space-y-100">
                <p className="line-clamp-2 text-sm font-semibold text-fg-primary">{itemName}</p>
                <div className="flex items-center justify-between gap-150">
                  <ExtraText className="text-fg-secondary">{`× ${itemQuantity}`}</ExtraText>
                  <p className="text-sm font-semibold text-fg-primary">{itemPrice}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="space-y-150 border-t border-border-secondary pt-250">
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
        <div className="flex items-center justify-between gap-200 border-t border-border-secondary pt-150">
          <p className="text-sm font-semibold text-fg-primary">Celkom</p>
          <p className="text-lg font-bold text-fg-primary">
            {formatCurrencyAmount(cartTotalAmount, currencyCode)}
          </p>
        </div>
      </div>

      <div className="space-y-150 rounded-lg border border-border-secondary bg-surface-secondary p-250">
        <StatusText showIcon size="sm" status={hasShipping ? "success" : "warning"}>
          {hasShipping
            ? `Doprava: ${selectedOptionName ?? "Zvolená"}`
            : "Doprava: nevybraná"}
        </StatusText>
        <StatusText showIcon size="sm" status={hasPayment ? "success" : "warning"}>
          {hasPayment ? "Platba: inicializovaná" : "Platba: nevybraná"}
        </StatusText>
      </div>
    </section>
  );
}
