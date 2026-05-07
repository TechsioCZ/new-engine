"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Popover } from "@techsio/ui-kit/molecules/popover";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const updateLineItemMutation = useUpdateLineItem();
  const removeLineItemMutation = useRemoveLineItem();
  const cartItems = cart?.items ?? [];
  const router = useRouter();
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

  useEffect(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const handleTriggerClick = (event: MouseEvent) => {
      event.preventDefault();
      setIsPopoverOpen(false);
      router.push("/checkout/kosik");
    };

    trigger.addEventListener("click", handleTriggerClick, true);

    return () => {
      trigger.removeEventListener("click", handleTriggerClick, true);
    };
  }, [router]);

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
      triggerRef={triggerRef}
      trigger={
        <>
          <div className="relative">
            <Icon icon="token-icon-cart" size="2xl" />
            <Badge className="absolute -top-[7px] bg-surface text-primary -right-200 min-w-500 justify-center rounded-full px-100 py-50 text-[11px]"
              variant="success">
              {itemCount > 99 ? "99+" : String(itemCount)}
            </Badge>
          </div>
          <span className="text-md font-normal font-sans">{cartTotalLabel}</span>
        </>
      }
      triggerClassName="relative sm:w-36 inline-flex items-center gap-250 rounded-button-sm bg-button-bg-primary px-450 py-300 text-xl font-bold text-button-fg-primary hover:bg-button-bg-primary-hover data-[state=open]:bg-button-bg-primary-hover py-550"
    >
      {visibleItems.length > 0 ? (
        <>
          <div className="space-y-250 pt-200 overflow-y-auto pr-100">
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
            <p className="text-fg-secondary text-xs">{`+ ${hiddenItemCount} ďalších položiek v košíku`}</p>
          ) : null}

          {errorMessage ? (
            <StatusText showIcon status="error">
              {errorMessage}
            </StatusText>
          ) : null}

          <div className="space-y-150 border-border-secondary border-t pt-250">
            <div className="flex items-center justify-between gap-200">
              <span className="text-fg-secondary">Medzisúčet:</span>
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
                <span>Zľava:</span>
                <span>
                  -{formatCurrencyAmount(discountAmount, currencyCode)}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-200 border-border-secondary border-t pt-200 font-bold text-lg">
              <span>Spolu:</span>
              <span>{cartTotalLabel}</span>
            </div>
          </div>

          <div className="space-y-150">
            <LinkButton
              as={NextLink}
              block
              href="/checkout/kosik"
              onClick={handleClose}
              size="md"
              variant="primary"
            >
              Pokračovať k pokladni
            </LinkButton>
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-200 py-400 text-center"
          role="status"
        >
          <span
            aria-hidden="true"
            className="grid place-items-center text-primary"
          >
            <Icon icon="token-icon-cart" className="text-icon-cart" />
          </span>
          <div className="space-y-50">
            <p className="font-semibold text-fg-primary">
              Váš košík je prázdny
            </p>
            <p className="text-fg-secondary text-sm">
              Produkty môžete pridať z katalógu.
            </p>
          </div>
        </div>
      )}
    </Popover>
  );
}
