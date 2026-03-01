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
      <h2 className="checkout-cart-step-heading text-4xl leading-tight font-semibold text-fg-primary">
        {`Váš košík (${cartItems.length})`}
      </h2>

      <div className="checkout-card checkout-cart-progress-card">
        <p className="checkout-cart-progress-text text-sm text-fg-primary">
          {missingAmount > 0 ? (
            <>
              {`Nakúpte ešte za ${missingAmountLabel} a získajte `}
              <span className="font-semibold">dopravu zadarmo.</span>
            </>
          ) : (
            "Dopravu zadarmo už máte v košíku."
          )}
        </p>

        <div className="checkout-cart-progress-row">
          <div
            aria-label="Priebeh do dopravy zadarmo"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progressValue)}
            className="checkout-cart-progress-track"
            role="progressbar"
          >
            <div
              className="checkout-cart-progress-fill transition-[width] duration-300 ease-out"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="checkout-cart-progress-target">
            <span className="checkout-cart-progress-target-icon">
              <Icon className="text-lg text-fg-secondary" icon="icon-[mdi--truck-delivery-outline]" />
            </span>
            <span className="font-rubik text-sm text-fg-primary">{freeShippingTargetLabel}</span>
          </div>
        </div>
      </div>

      <div className="checkout-card checkout-cart-items-card overflow-hidden">
        {cartItems.map((item, index) => (
          <div
            className={`checkout-cart-item-shell ${index > 0 ? "border-t border-border-secondary" : ""}`}
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
