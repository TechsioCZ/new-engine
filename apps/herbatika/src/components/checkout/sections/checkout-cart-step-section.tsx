"use client";

import type { HttpTypes } from "@medusajs/types";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { useState } from "react";
import { CheckoutCartItemRow } from "./checkout-cart-item-row";
import {
  useRemoveLineItem,
  useUpdateLineItem,
} from "@/lib/storefront/cart";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

const FREE_SHIPPING_THRESHOLD_EUR = 49;

const resolveSupportedCurrency = (currencyCode: string): "EUR" | "CZK" => {
  return currencyCode.toUpperCase() === "CZK" ? "CZK" : "EUR";
};

type CheckoutCartStepSectionProps = {
  cartId?: string;
  cartItems: HttpTypes.StoreCartLineItem[];
  cartSubtotalAmount: number;
  currencyCode: string;
};

export function CheckoutCartStepSection({
  cartId,
  cartItems,
  cartSubtotalAmount,
  currencyCode,
}: CheckoutCartStepSectionProps) {
  const [lineItemError, setLineItemError] = useState<string | null>(null);
  const updateLineItemMutation = useUpdateLineItem();
  const removeLineItemMutation = useRemoveLineItem();

  const isPending =
    updateLineItemMutation.isPending || removeLineItemMutation.isPending;
  const supportedCurrencyCode = resolveSupportedCurrency(currencyCode);
  const missingAmount = Math.max(FREE_SHIPPING_THRESHOLD_EUR - cartSubtotalAmount, 0);
  const progressValue = Math.min(
    (cartSubtotalAmount / FREE_SHIPPING_THRESHOLD_EUR) * 100,
    100,
  );
  const missingAmountLabel = formatCurrencyAmount(
    missingAmount,
    supportedCurrencyCode,
  );
  const freeShippingTargetLabel = formatCurrencyAmount(
    FREE_SHIPPING_THRESHOLD_EUR,
    supportedCurrencyCode,
  );

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    if (!cartId) {
      return;
    }

    setLineItemError(null);
    updateLineItemMutation.mutate(
      { cartId, lineItemId, quantity },
      {
        onError: (error) => {
          setLineItemError(resolveErrorMessage(error));
        },
      },
    );
  };

  const handleRemove = (lineItemId: string) => {
    if (!cartId) {
      return;
    }

    setLineItemError(null);
    removeLineItemMutation.mutate(
      { cartId, lineItemId },
      {
        onError: (error) => {
          setLineItemError(resolveErrorMessage(error));
        },
      },
    );
  };

  return (
    <section className="space-y-300">
      <h2 className="text-4xl leading-tight font-semibold text-fg-primary">
        {`Váš košík (${cartItems.length})`}
      </h2>

      <div className="min-h-900 rounded-sm border border-border-primary bg-surface px-400 pt-400 pb-650 md:px-550">
        <p className="text-center text-sm font-light leading-relaxed text-fg-primary">
          {missingAmount > 0 ? (
            <>
              {`Nakúpte ešte za ${missingAmountLabel} a získajte `}
              <span className="font-semibold">dopravu zadarmo.</span>
            </>
          ) : (
            "Dopravu zadarmo už máte v košíku."
          )}
        </p>

        <div className="mt-400 flex items-start gap-200">
          <div
            aria-label="Priebeh do dopravy zadarmo"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progressValue)}
            className="relative mt-150 h-100 flex-1 overflow-hidden rounded-xs bg-border-primary"
            role="progressbar"
          >
            <div
              className="h-full rounded-xs bg-success transition-all duration-300 ease-out"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="flex min-w-700 flex-col items-center gap-50">
            <span className="inline-flex h-700 w-700 items-center justify-center rounded-full border border-border-primary bg-overlay">
              <Icon className="text-lg text-fg-secondary" icon="icon-[mdi--truck-delivery-outline]" />
            </span>
            <span className="text-sm text-fg-primary">{freeShippingTargetLabel}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-border-primary bg-surface p-400 md:px-550 md:pt-550 md:pb-500">
        {cartItems.map((item, index) => (
          <div
            className={`py-250 ${index > 0 ? "border-t border-border-secondary" : ""}`}
            key={item.id}
          >
            <CheckoutCartItemRow
              currencyCode={supportedCurrencyCode}
              isPending={isPending}
              item={item}
              onRemove={handleRemove}
              onUpdateQuantity={handleUpdateQuantity}
            />
          </div>
        ))}
      </div>

      {lineItemError ? <ErrorText showIcon>{lineItemError}</ErrorText> : null}
    </section>
  );
}
