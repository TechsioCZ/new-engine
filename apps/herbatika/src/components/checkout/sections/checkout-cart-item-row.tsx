"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import NextImage from "next/image";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "@/components/header/herbatika-cart-item.utils";
import {
  asFiniteNumber,
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { resolveAvailabilityText, resolveFallbackDeliveryLabel, resolveOriginalLineItemTotalAmount } from "../utils/resolve-availability-text";

type CheckoutCartItemRowProps = {
  currencyCode: "EUR" | "CZK";
  isPending: boolean;
  item: HttpTypes.StoreCartLineItem;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
};

export function CheckoutCartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
}: CheckoutCartItemRowProps) {
  const baseQuantity = resolveLineItemQuantity(item);
  const [localQuantity, setLocalQuantity] = useState(baseQuantity);
  const itemName = resolveCartItemName(item);
  const itemHref = resolveLineItemHref(item);
  const itemInventory = resolveLineItemInventory(item);
  const itemMaxQuantity = Math.max(
    baseQuantity,
    itemInventory ?? FALLBACK_MAX_QUANTITY,
  );
  const currentLineAmount = resolveLineItemTotalAmount(item);
  const originalLineAmount = useMemo(
    () => resolveOriginalLineItemTotalAmount(item),
    [item],
  );
  const shouldShowOriginalAmount =
    typeof originalLineAmount === "number" &&
    originalLineAmount > currentLineAmount + 0.001;
  const availabilityText = resolveAvailabilityText(item);

  useEffect(() => {
    setLocalQuantity(baseQuantity);
  }, [baseQuantity]);

  useEffect(() => {
    if (localQuantity === baseQuantity) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onUpdateQuantity(item.id, localQuantity);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [baseQuantity, item.id, localQuantity, onUpdateQuantity]);

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    const normalizedQuantity = Math.max(
      1,
      Math.min(Math.round(nextQuantity), itemMaxQuantity),
    );
    setLocalQuantity(normalizedQuantity);
  };

  return (
    <article className="flex flex-col w-full gap-250 sm:flex-row sm:items-start md:gap-300 md:grid md:grid-cols-[auto_1fr]">
      <div className="flex gap-100">
      <Link
        as={NextLink}
        className="inline-flex size-[120px] shrink-0"
        href={itemHref}
      >
        <NextImage
          alt={itemName}
          className="object-cover"
          height={120}
          quality={50}
          src={resolveLineItemThumbnail(item)}
          width={120}
        />
      </Link>
      <div className="flex flex-col gap-300 items-start sm:hidden w-full">
            <Link
              as={NextLink}
              className="font-normal text-fg-primary text-md leading-snug no-underline hover:text-fg-primary"
              href={itemHref}
            >
              {itemName}
            </Link>
          <div className="flex w-full justify-between">
             <div className="flex justify-center">
            <NumericInput
              allowOverflow={false}
              className="w-20 shrink-0 sm:w-24"
              max={itemMaxQuantity}
              min={1}
              onChange={handleQuantityChange}
              size="md"
              value={localQuantity}
            >
              <NumericInput.Control>
                <NumericInput.DecrementTrigger
                  disabled={isPending || localQuantity <= 1}
                />
                <NumericInput.Input
                  aria-label={`Množstvo pre ${itemName}`}
                  className="text-center"
                />
                <NumericInput.IncrementTrigger
                  disabled={isPending || localQuantity >= itemMaxQuantity}
                />
              </NumericInput.Control>
            </NumericInput>
          </div>
          <div className="flex flex-col gap-100">
            {shouldShowOriginalAmount ? (
              <p className="font-light text-fg-secondary text-sm leading-tight line-through">
                {formatCurrencyAmount(originalLineAmount, currencyCode)}
              </p>
            ) : null}
            <p className="font-bold text-fg-primary text-xl leading-tight">
              {formatCurrencyAmount(currentLineAmount, currencyCode)}
            </p>
          </div>
          </div>
      </div>
      </div>

      <div className="grid grid-rows-[1fr_auto] h-full w-full">
        <div className="hidden sm:grid sm:grid-cols-[3fr_2fr_auto]">
          <div className="flex items-start">
            <Link
              as={NextLink}
              className="font-normal text-fg-primary text-md leading-snug no-underline hover:text-fg-primary"
              href={itemHref}
            >
              {itemName}
            </Link>
          </div>

          <div className="flex justify-center">
            <NumericInput
              allowOverflow={false}
              className="w-20 shrink-0 sm:w-24"
              max={itemMaxQuantity}
              min={1}
              onChange={handleQuantityChange}
              size="md"
              value={localQuantity}
            >
              <NumericInput.Control>
                <NumericInput.DecrementTrigger
                  disabled={isPending || localQuantity <= 1}
                />
                <NumericInput.Input
                  aria-label={`Množstvo pre ${itemName}`}
                  className="text-center"
                />
                <NumericInput.IncrementTrigger
                  disabled={isPending || localQuantity >= itemMaxQuantity}
                />
              </NumericInput.Control>
            </NumericInput>
          </div>
          <div className="flex flex-col gap-100">
            {shouldShowOriginalAmount ? (
              <p className="font-light text-fg-secondary text-sm leading-tight line-through">
                {formatCurrencyAmount(originalLineAmount, currencyCode)}
              </p>
            ) : null}
            <p className="font-bold text-fg-primary text-xl leading-tight">
              {formatCurrencyAmount(currentLineAmount, currencyCode)}
            </p>
          </div>
        </div>

          
        <div className="flex justify-between items-center">
          <p className="inline-flex items-end h-full gap-150 font-medium text-primary text-xs leading-normal">
            <span className="h-fit flex items-center gap-150">
            <Icon className="shrink-0 text-md" icon="token-icon-check" />
            <span className="min-w-0">{availabilityText}</span>
            </span>
          </p>
          <Button
            aria-label={`Odstrániť ${itemName} z košíka`}
            className="text-fg-secondary text-2xl hover:text-fg-primary"
            disabled={isPending}
            icon="token-icon-trash"
            onClick={() => onRemove(item.id)}
            size="sm"
            theme="unstyled"
            variant="secondary"
          />
        </div>
      </div>

    </article>
  );
}
