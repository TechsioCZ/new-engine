"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  asFiniteNumber,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "@/components/header/herbatika-cart-item.utils";
import { resolveCartItemName } from "@/components/checkout/checkout.utils";

type CheckoutCartItemRowProps = {
  currencyCode: "EUR" | "CZK";
  isPending: boolean;
  item: HttpTypes.StoreCartLineItem;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
};

const toSkDate = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const addBusinessDays = (start: Date, daysToAdd: number) => {
  const date = new Date(start);
  let remainingDays = daysToAdd;

  while (remainingDays > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays -= 1;
    }
  }

  return date;
};

const resolveFallbackDeliveryLabel = () => {
  const deliveryDate = addBusinessDays(new Date(), 3);
  return `u Vás do ${toSkDate(deliveryDate)}`;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveOriginalLineItemTotalAmount = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const compareAtUnit = asFiniteNumber(itemRecord.compare_at_unit_price);
  if (compareAtUnit === null) {
    return null;
  }

  return compareAtUnit * resolveLineItemQuantity(item);
};

const resolveAvailabilityText = (item: HttpTypes.StoreCartLineItem) => {
  const metadata = asRecord((item as unknown as Record<string, unknown>).metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const stockAmount = asFiniteNumber(stock?.amount) ?? resolveLineItemInventory(item);
  const isInStock = stockAmount === null ? true : stockAmount > 0;

  if (!isInStock) {
    return asString(topOffer?.availability_out_of_stock) ?? "Momentálne nie je skladom";
  }

  const availabilityLabel = asString(topOffer?.availability_in_stock) ?? "Na sklade";
  const deliveryLabel = asString(topOffer?.delivery_label) ?? resolveFallbackDeliveryLabel();
  return `${availabilityLabel}, ${deliveryLabel}`;
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
    <article className="checkout-cart-row">
      <Link as={NextLink} className="checkout-cart-row-media" href={itemHref}>
        <Image
          alt={itemName}
          className="checkout-cart-row-thumb object-cover"
          src={resolveLineItemThumbnail(item)}
        />
      </Link>

      <div className="checkout-cart-row-content">
        <Link
          as={NextLink}
          className="checkout-cart-row-title text-md leading-snug font-normal text-fg-primary no-underline hover:text-fg-primary"
          href={itemHref}
        >
          {itemName}
        </Link>

        <p className="checkout-cart-row-availability text-xs leading-normal font-medium text-primary">
          <Icon className="text-md" icon="icon-[mdi--check]" />
          <span>{availabilityText}</span>
        </p>
      </div>

      <NumericInput
        allowOverflow={false}
        className="checkout-cart-row-quantity"
        max={itemMaxQuantity}
        min={1}
        onChange={handleQuantityChange}
        value={localQuantity}
      >
        <NumericInput.DecrementTrigger
          className="checkout-cart-row-quantity-trigger"
          disabled={isPending || localQuantity <= 1}
          icon="icon-[mdi--minus]"
          size="sm"
          theme="unstyled"
          variant="secondary"
        />

        <NumericInput.Control className="checkout-cart-row-quantity-control">
          <NumericInput.Input
            aria-label={`Množstvo pre ${itemName}`}
            className="checkout-cart-row-quantity-input"
          />
        </NumericInput.Control>

        <NumericInput.IncrementTrigger
          className="checkout-cart-row-quantity-trigger"
          disabled={isPending || localQuantity >= itemMaxQuantity}
          icon="icon-[mdi--plus]"
          size="sm"
          theme="unstyled"
          variant="secondary"
        />
      </NumericInput>

      <div className="checkout-cart-row-side">
        {shouldShowOriginalAmount ? (
          <p className="text-sm leading-tight font-light text-fg-secondary line-through">
            {formatCurrencyAmount(originalLineAmount, currencyCode)}
          </p>
        ) : (
          <span />
        )}
        <p className="text-xl leading-tight font-bold text-fg-primary">
          {formatCurrencyAmount(currentLineAmount, currencyCode)}
        </p>
        <Button
          aria-label={`Odstrániť ${itemName} z košíka`}
          className="checkout-cart-row-remove text-fg-secondary hover:text-fg-primary"
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
