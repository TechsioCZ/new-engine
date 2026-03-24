"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Popover } from "@techsio/ui-kit/molecules/popover";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { useState } from "react";
import { useRemoveLineItem, useUpdateLineItem } from "@/lib/storefront/cart";
import {
  asFiniteNumber,
  resolveCartSubtotalAmount,
} from "@/lib/storefront/cart-calculations";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { CartItemRow } from "./herbatika-cart-item-row";

type HerbatikaCartPopoverProps = {
  cart: HttpTypes.StoreCart | null | undefined;
  cartTotalLabel: string;
  currencyCode: "EUR" | "CZK";
  itemCount: number;
};

export function HerbatikaCartPopover({
  cart,
  cartTotalLabel,
  currencyCode,
  itemCount,
}: HerbatikaCartPopoverProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateLineItemMutation = useUpdateLineItem();
  const removeLineItemMutation = useRemoveLineItem();
  const cartItems = cart?.items ?? [];
  const cartSubtotalLabel = formatCurrencyAmount(
    resolveCartSubtotalAmount(cart),
    currencyCode,
  );
  const shippingAmount = asFiniteNumber(cart?.shipping_total);
  const taxAmount = asFiniteNumber(cart?.tax_total);
  const discountAmount = asFiniteNumber(cart?.discount_total);
  const hiddenItemCount = Math.max(cartItems.length - 4, 0);
  const visibleItems = cartItems.slice(0, 4);
  const isPending =
    updateLineItemMutation.isPending || removeLineItemMutation.isPending;

  const handleClose = () => {
    setIsPopoverOpen(false);
  };

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    if (!cart?.id) {
      return;
    }

    setErrorMessage(null);
    updateLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
        quantity,
      },
      {
        onError: (error) => {
          setErrorMessage(resolveErrorMessage(error));
        },
      },
    );
  };

  const handleRemove = (lineItemId: string) => {
    if (!cart?.id) {
      return;
    }

    setErrorMessage(null);
    removeLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
      },
      {
        onError: (error) => {
          setErrorMessage(resolveErrorMessage(error));
        },
      },
    );
  };

  return (
    <Popover
      contentClassName="w-[27rem] max-w-[calc(100vw-2rem)] space-y-300"
      gutter={10}
      hoverCloseDelay={120}
      id="herbatika-cart-popover"
      onOpenChange={({ open }) => setIsPopoverOpen(open)}
      open={isPopoverOpen}
      openOnHover
      placement="bottom-end"
      portalled={false}
      shadow={false}
      title={itemCount > 0 ? `Košík (${itemCount})` : "Košík"}
      trigger={
        <>
          <Icon icon="token-icon-cart" />
          <span>{cartTotalLabel}</span>
          <Badge
            className="absolute -top-200 -right-200 min-w-500 justify-center rounded-full px-100 py-50 text-xs"
            variant="secondary"
          >
            {itemCount > 99 ? "99+" : String(itemCount)}
          </Badge>
        </>
      }
      triggerClassName="relative inline-flex items-center gap-250 rounded-button-sm bg-button-bg-primary px-450 py-300 text-xl font-bold text-button-fg-primary hover:bg-button-bg-primary-hover data-[state=open]:bg-button-bg-primary-hover"
    >
      {visibleItems.length > 0 ? (
        <>
          <div className="space-y-250 overflow-y-auto pr-100">
            {visibleItems.map((item) => (
              <CartItemRow
                currencyCode={currencyCode}
                isPending={isPending}
                item={item}
                key={item.id}
                onRemove={handleRemove}
                onUpdateQuantity={handleUpdateQuantity}
              />
            ))}
          </div>

          {hiddenItemCount > 0 ? (
            <p className="text-fg-secondary text-xs">{`+ ${hiddenItemCount} dalších položek v košíku`}</p>
          ) : null}

          {errorMessage ? (
            <StatusText showIcon status="error">
              {errorMessage}
            </StatusText>
          ) : null}

          <div className="space-y-150 border-border-secondary border-t pt-250">
            <div className="flex items-center justify-between gap-200">
              <span className="text-fg-secondary">Mezisoučet:</span>
              <span>{cartSubtotalLabel}</span>
            </div>

            {shippingAmount !== null && shippingAmount > 0 ? (
              <div className="flex items-center justify-between gap-200">
                <span className="text-fg-secondary">Doprava:</span>
                <span>
                  {formatCurrencyAmount(shippingAmount, currencyCode)}
                </span>
              </div>
            ) : null}

            {taxAmount !== null && taxAmount > 0 ? (
              <div className="flex items-center justify-between gap-200">
                <span className="text-fg-secondary">DPH:</span>
                <span>{formatCurrencyAmount(taxAmount, currencyCode)}</span>
              </div>
            ) : null}

            {discountAmount !== null && discountAmount > 0 ? (
              <div className="flex items-center justify-between gap-200 text-success">
                <span>Sleva:</span>
                <span>
                  -{formatCurrencyAmount(discountAmount, currencyCode)}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-200 border-border-secondary border-t pt-200 font-bold text-lg">
              <span>Celkem:</span>
              <span>{cartTotalLabel}</span>
            </div>
          </div>

          <div className="space-y-150">
            <LinkButton
              as={NextLink}
              block
              className="justify-center"
              href="/checkout/kosik"
              onClick={handleClose}
              size="md"
              variant="primary"
            >
              Přejít k pokladně
            </LinkButton>
            <Button
              block
              onClick={handleClose}
              size="md"
              theme="outlined"
              variant="secondary"
            >
              Pokračovat v nákupu
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-250">
          <p className="text-fg-secondary text-sm">Košík je zatím prázdný.</p>
          <LinkButton
            as={NextLink}
            block
            className="justify-center"
            href="/search"
            onClick={handleClose}
            size="sm"
            variant="secondary"
          >
            Pokračovat v nákupu
          </LinkButton>
        </div>
      )}
    </Popover>
  );
}
