"use client";

import type { HttpTypes } from "@medusajs/types";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useState } from "react";
import { CartItemRow } from "@/components/header/herbatika-cart-item-row";
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
  nextStepHref: string;
};

export function CheckoutCartStepSection({
  cartId,
  cartItems,
  cartSubtotalAmount,
  currencyCode,
  nextStepHref,
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
  const progressLabel =
    missingAmount > 0
      ? `Nakúpte ešte za ${formatCurrencyAmount(
          missingAmount,
          supportedCurrencyCode,
        )} a získajte dopravu zadarmo.`
      : "Dopravu zadarmo už máte v košíku.";

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
    <section className="checkout-card space-y-300 p-550">
      <header className="space-y-150">
        <h2 className="text-2xl font-semibold text-fg-primary">{`Váš košík (${cartItems.length})`}</h2>
        <p className="text-sm text-fg-secondary">{progressLabel}</p>
        <div
          aria-label="Priebeh do dopravy zadarmo"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progressValue)}
          className="h-100 overflow-hidden rounded-full bg-surface-secondary"
          role="progressbar"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </header>

      <div className="overflow-hidden rounded-sm border border-border-primary bg-surface">
        {cartItems.map((item, index) => (
          <div
            className={`${index > 0 ? "border-t border-border-secondary" : ""} p-250`}
            key={item.id}
          >
            <CartItemRow
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

      <div className="flex justify-end">
        <LinkButton as={NextLink} href={nextStepHref} size="md" variant="primary">
          Pokračovať na dopravu a platbu
        </LinkButton>
      </div>
    </section>
  );
}
