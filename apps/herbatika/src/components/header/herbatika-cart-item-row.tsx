"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import Image from "next/image";
import NextLink from "next/link";
import { CartItemQuantityInput } from "@/components/cart/cart-item-quantity-input";
import { useCartItemQuantity } from "@/components/cart/use-cart-item-quantity";
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemUnitAmount,
} from "@/lib/storefront/cart-calculations";
import {
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemMaxQuantity,
  resolveLineItemThumbnail,
} from "@/lib/storefront/cart-line-item";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

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
  const itemName = resolveCartItemName(item);
  const itemHref = resolveLineItemHref(item);
  const itemVariant = item.variant_title;
  const itemInventory = resolveLineItemInventory(item);
  const itemMaxQuantity = resolveLineItemMaxQuantity(item);
  const itemUnitAmountLabel = formatCurrencyAmount(
    resolveLineItemUnitAmount(item),
    currencyCode,
  );
  const { handleQuantityChange, localQuantity } = useCartItemQuantity({
    baseQuantity,
    itemId: item.id,
    maxQuantity: itemMaxQuantity,
    onUpdateQuantity,
  });

  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-200">
      <Image
        alt={itemName}
        className="h-10 w-10 rounded-md border border-border-secondary object-cover"
        height={60}
        src={resolveLineItemThumbnail(item)}
        width={60}
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
        <CartItemQuantityInput
          className="w-20"
          isPending={isPending}
          itemName={itemName}
          maxQuantity={itemMaxQuantity}
          onQuantityChange={handleQuantityChange}
          quantity={localQuantity}
        />

        <Button
          aria-label={`Odstránit ${itemName} z košíku`}
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
