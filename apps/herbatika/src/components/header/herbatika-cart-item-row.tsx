"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import Image from "next/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemUnitAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "./herbatika-cart-item.utils";

type CartItemRowProps = {
  currencyCode: "EUR" | "CZK";
  isPending: boolean;
  item: HttpTypes.StoreCartLineItem;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
};

export function CartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemRowProps) {
  const baseQuantity = resolveLineItemQuantity(item);
  const [localQuantity, setLocalQuantity] = useState(baseQuantity);
  const itemName = resolveCartItemName(item);
  const itemHref = resolveLineItemHref(item);
  const itemVariant = item.variant_title;
  const itemInventory = resolveLineItemInventory(item);
  const itemMaxQuantity = Math.max(
    baseQuantity,
    itemInventory ?? FALLBACK_MAX_QUANTITY,
  );
  const itemUnitAmountLabel = formatCurrencyAmount(
    resolveLineItemUnitAmount(item),
    currencyCode,
  );

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
    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-200">
      <Image
        alt={itemName}
        width={60}
        height={60}
        className="rounded-md h-10 w-10 border border-border-secondary object-cover"
        src={resolveLineItemThumbnail(item)}
      />

      <div className="min-w-0">
        <Link
          as={NextLink}
          className="block truncate font-semibold text-sm underline"
          href={itemHref}
        >
          {itemName}
        </Link>

        {itemVariant && itemVariant !== "Default" ? (
          <p className="truncate text-fg-secondary text-xs">{itemVariant}</p>
        ) : null}

        <p className="font-semibold text-sm">{itemUnitAmountLabel}</p>

        {itemInventory !== null && itemInventory > 0 && itemInventory <= 2 ? (
          <p className="text-danger text-xs">{`Zbývá pouze ${itemInventory} ks`}</p>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-150">
        <NumericInput
          allowOverflow={false}
          className="h-750 gap-0 border-collapse"
          max={itemMaxQuantity}
          min={1}
          onChange={handleQuantityChange}
          value={localQuantity}
        >
          <NumericInput.DecrementTrigger
            className="bg-surface"
            disabled={isPending || localQuantity <= 1}
            icon="icon-[mdi--minus]"
            theme="outlined"
            variant="secondary"
          />

          <NumericInput.Control className="w-500 border-border-secondary border-x-0 focus-within:border-x-1 focus-within:border-border-secondary">
            <NumericInput.Input
              aria-label={`Množství pro ${itemName}`}
              className="px-0 text-center"
            />
          </NumericInput.Control>

          <NumericInput.IncrementTrigger
            className="bg-surface"
            disabled={isPending || localQuantity >= itemMaxQuantity}
            icon="icon-[mdi--plus]"
            theme="outlined"
            variant="secondary"
          />
        </NumericInput>

        <Button
          aria-label={`Odstranit ${itemName} z košíku`}
          className="h-650 w-650 p-0 text-fg-secondary hover:text-fg-primary"
          disabled={isPending}
          icon="icon-[mdi--trash-can-outline]"
          onClick={() => onRemove(item.id)}
          size="sm"
          theme="unstyled"
          variant="secondary"
        />
      </div>
    </article>
  );
}
