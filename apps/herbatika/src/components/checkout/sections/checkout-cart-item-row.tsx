"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextImage from "next/image";
import NextLink from "next/link";
import { CartItemQuantityInput } from "@/components/cart/cart-item-quantity-input";
import { useCartItemQuantity } from "@/components/cart/use-cart-item-quantity";
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import {
  resolveLineItemAvailabilityText,
  resolveLineItemHref,
  resolveLineItemMaxQuantity,
  resolveLineItemOriginalTotalAmount,
  resolveLineItemThumbnail,
} from "@/lib/storefront/cart-line-item";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

type CheckoutCartItemRowProps = {
  currencyCode: "EUR" | "CZK";
  isPending: boolean;
  item: HttpTypes.StoreCartLineItem;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
};

type CheckoutCartItemNameLinkProps = {
  href: string;
  itemName: string;
};

function CheckoutCartItemNameLink({
  href,
  itemName,
}: CheckoutCartItemNameLinkProps) {
  return (
    <Link
      as={NextLink}
      className="font-normal text-fg-primary text-md leading-snug no-underline hover:text-fg-primary"
      href={href}
    >
      {itemName}
    </Link>
  );
}

type CheckoutCartItemPriceProps = {
  currencyCode: CheckoutCartItemRowProps["currencyCode"];
  currentLineAmount: number;
  originalLineAmount: number | null;
  shouldShowOriginalAmount: boolean;
};

function CheckoutCartItemPrice({
  currencyCode,
  currentLineAmount,
  originalLineAmount,
  shouldShowOriginalAmount,
}: CheckoutCartItemPriceProps) {
  return (
    <div className="flex flex-col gap-100">
      {shouldShowOriginalAmount && originalLineAmount !== null ? (
        <p className="font-light text-fg-secondary text-sm leading-tight line-through">
          {formatCurrencyAmount(originalLineAmount, currencyCode)}
        </p>
      ) : null}
      <p className="font-bold text-fg-primary text-xl leading-tight">
        {formatCurrencyAmount(currentLineAmount, currencyCode)}
      </p>
    </div>
  );
}

type CheckoutCartItemControlsProps = {
  currencyCode: CheckoutCartItemRowProps["currencyCode"];
  currentLineAmount: number;
  isPending: boolean;
  itemMaxQuantity: number;
  itemName: string;
  localQuantity: number;
  onQuantityChange: (nextQuantity: number) => void;
  originalLineAmount: number | null;
  shouldShowOriginalAmount: boolean;
};

function CheckoutCartItemControls({
  currencyCode,
  currentLineAmount,
  isPending,
  itemMaxQuantity,
  itemName,
  localQuantity,
  onQuantityChange,
  originalLineAmount,
  shouldShowOriginalAmount,
}: CheckoutCartItemControlsProps) {
  return (
    <>
      <div className="flex justify-center">
        <CartItemQuantityInput
          className="w-20 shrink-0 sm:w-24"
          isPending={isPending}
          itemName={itemName}
          maxQuantity={itemMaxQuantity}
          onQuantityChange={onQuantityChange}
          quantity={localQuantity}
        />
      </div>

      <CheckoutCartItemPrice
        currencyCode={currencyCode}
        currentLineAmount={currentLineAmount}
        originalLineAmount={originalLineAmount}
        shouldShowOriginalAmount={shouldShowOriginalAmount}
      />
    </>
  );
}

export function CheckoutCartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
}: CheckoutCartItemRowProps) {
  const baseQuantity = resolveLineItemQuantity(item);
  const itemName = resolveCartItemName(item);
  const itemHref = resolveLineItemHref(item);
  const itemMaxQuantity = resolveLineItemMaxQuantity(item);
  const currentLineAmount = resolveLineItemTotalAmount(item);
  const originalLineAmount = resolveLineItemOriginalTotalAmount(item);
  const shouldShowOriginalAmount =
    typeof originalLineAmount === "number" &&
    originalLineAmount > currentLineAmount + 0.001;
  const availabilityText = resolveLineItemAvailabilityText(item);
  const { handleQuantityChange, localQuantity } = useCartItemQuantity({
    baseQuantity,
    itemId: item.id,
    maxQuantity: itemMaxQuantity,
    onUpdateQuantity,
  });

  return (
    <article className="flex w-full flex-col gap-250 sm:flex-row sm:items-start md:grid md:grid-cols-[auto_1fr] md:gap-300">
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

        <div className="flex w-full flex-col items-start gap-300 sm:hidden">
          <CheckoutCartItemNameLink href={itemHref} itemName={itemName} />

          <div className="flex w-full justify-between">
            <CheckoutCartItemControls
              currencyCode={currencyCode}
              currentLineAmount={currentLineAmount}
              isPending={isPending}
              itemMaxQuantity={itemMaxQuantity}
              itemName={itemName}
              localQuantity={localQuantity}
              onQuantityChange={handleQuantityChange}
              originalLineAmount={originalLineAmount}
              shouldShowOriginalAmount={shouldShowOriginalAmount}
            />
          </div>
        </div>
      </div>

      <div className="grid h-full w-full grid-rows-[1fr_auto]">
        <div className="hidden sm:grid sm:grid-cols-[3fr_2fr_auto]">
          <div className="flex items-start">
            <CheckoutCartItemNameLink href={itemHref} itemName={itemName} />
          </div>

          <CheckoutCartItemControls
            currencyCode={currencyCode}
            currentLineAmount={currentLineAmount}
            isPending={isPending}
            itemMaxQuantity={itemMaxQuantity}
            itemName={itemName}
            localQuantity={localQuantity}
            onQuantityChange={handleQuantityChange}
            originalLineAmount={originalLineAmount}
            shouldShowOriginalAmount={shouldShowOriginalAmount}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="inline-flex h-full items-end gap-150 font-medium text-primary text-xs leading-normal">
            <span className="flex h-fit items-center gap-150">
              <Icon className="shrink-0 text-md" icon="icon-[mdi--check]" />
              <span className="min-w-0">{availabilityText}</span>
            </span>
          </p>

          <Button
            aria-label={`Odstrániť ${itemName} z košíka`}
            className="text-fg-secondary text-2xl hover:text-fg-primary"
            disabled={isPending}
            icon="icon-[mdi--trash-can-outline]"
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
