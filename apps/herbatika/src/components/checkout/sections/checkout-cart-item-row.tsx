"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextImage from "next/image";
import NextLink from "next/link";
import { useMemo } from "react";
import { CartLineItemQuantityInput } from "@/components/cart/cart-line-item-quantity-input";
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "@/components/header/herbatika-cart-item.utils";
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  resolveAvailabilityText,
  resolveOriginalLineItemTotalAmount,
} from "../utils/resolve-availability-text";

type CheckoutCartItemRowProps = {
  currencyCode: "EUR" | "CZK";
  isPending: boolean;
  item: HttpTypes.StoreCartLineItem;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
  product?: HttpTypes.StoreProduct | null;
};

type CheckoutCartItemPriceProps = {
  currencyCode: CheckoutCartItemRowProps["currencyCode"];
  currentLineAmount: number;
  originalLineAmount: number | null;
};

function CheckoutCartItemPrice({
  currencyCode,
  currentLineAmount,
  originalLineAmount,
}: CheckoutCartItemPriceProps) {
  const shouldShowOriginalAmount =
    typeof originalLineAmount === "number" &&
    originalLineAmount > currentLineAmount + 0.001;

  return (
    <div className="flex flex-col items-end gap-100">
      <p className="font-bold text-fg-primary text-xl leading-tight">
        {formatCurrencyAmount(currentLineAmount, currencyCode)}
      </p>
      {shouldShowOriginalAmount ? (
        <p className="font-light text-fg-secondary text-sm leading-tight line-through">
          {formatCurrencyAmount(originalLineAmount, currencyCode)}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutCartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
  product,
}: CheckoutCartItemRowProps) {
  const baseQuantity = resolveLineItemQuantity(item);
  const itemName = resolveCartItemName(item);
  const itemHref = resolveLineItemHref(item);
  const itemInventory = resolveLineItemInventory(item);
  const itemMaxQuantity = Math.max(
    baseQuantity,
    itemInventory ?? FALLBACK_MAX_QUANTITY,
  );
  const currentLineAmount = resolveLineItemTotalAmount(item);
  const originalLineAmount = useMemo(
    () => resolveOriginalLineItemTotalAmount(item, product),
    [item, product],
  );
  const availabilityText = resolveAvailabilityText(item, product);

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
            <CartLineItemQuantityInput
              className="w-20 shrink-0 sm:w-24"
              inputClassName="text-center"
              isPending={isPending}
              itemName={itemName}
              lineItemId={item.id}
              maxQuantity={itemMaxQuantity}
              onRemove={onRemove}
              onUpdateQuantity={onUpdateQuantity}
              quantity={baseQuantity}
            />
          </div>
          <CheckoutCartItemPrice
            currencyCode={currencyCode}
            currentLineAmount={currentLineAmount}
            originalLineAmount={originalLineAmount}
          />
          </div>
      </div>
      </div>

      <div className="grid grid-rows-[1fr_auto] h-full w-full">
        <div className="hidden gap-200 sm:grid sm:grid-cols-[3fr_1fr_1fr]">
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
            <CartLineItemQuantityInput
              className="w-20 shrink-0 sm:w-24"
              inputClassName="text-center pr-0 pl-0"
              isPending={isPending}
              itemName={itemName}
              lineItemId={item.id}
              maxQuantity={itemMaxQuantity}
              onRemove={onRemove}
              onUpdateQuantity={onUpdateQuantity}
              quantity={baseQuantity}
            />
          </div>
          <CheckoutCartItemPrice
            currencyCode={currencyCode}
            currentLineAmount={currentLineAmount}
            originalLineAmount={originalLineAmount}
          />
        </div>

          
        <div className="flex justify-between items-center">
          <p className="inline-flex items-end h-full gap-150 font-medium text-primary text-xs leading-normal">
            <span className="h-fit flex items-center gap-150">
            <Icon className="shrink-0" icon="token-icon-check" size="md" />
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
