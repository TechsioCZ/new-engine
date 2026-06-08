"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import Image from "next/image";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants";
import { resolvePriceState } from "@/components/product-card/product-card.pricing";
import type { StoreProductListItem } from "@/lib/storefront/product-lists";

type AccountProductListItemRowProps = {
  canChangeQuantity: boolean;
  isAddingToCart: boolean;
  isDeleting: boolean;
  isSettingQuantity: boolean;
  item: StoreProductListItem;
  onAddToCart: (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct,
  ) => void;
  onDelete: (item: StoreProductListItem) => void;
  onQuantitySet: (item: StoreProductListItem, quantity: number) => void;
  product: HttpTypes.StoreProduct | null;
};

const resolveQuantity = (item: StoreProductListItem) => {
  return typeof item.quantity === "number" && item.quantity > 0
    ? Math.floor(item.quantity)
    : 1;
};

export function AccountProductListItemRow({
  canChangeQuantity,
  isAddingToCart,
  isDeleting,
  isSettingQuantity,
  item,
  onAddToCart,
  onDelete,
  onQuantitySet,
  product,
}: AccountProductListItemRowProps) {
  const itemProduct = product ?? item.product ?? null;
  const productTitle = itemProduct?.title ?? item.product_id ?? "Produkt";
  const productHref = itemProduct?.handle ? `/p/${itemProduct.handle}` : "#";
  const imageSrc = itemProduct?.thumbnail ?? PRODUCT_FALLBACK_IMAGE;
  const price = itemProduct ? resolvePriceState(itemProduct) : null;
  const quantity = resolveQuantity(item);
  const canAddToCart = Boolean(itemProduct);
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingUpdate = useCallback(() => {
    if (updateTimeoutRef.current === null) {
      return;
    }

    clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    setLocalQuantity(quantity);
    clearPendingUpdate();
  }, [clearPendingUpdate, quantity]);

  useEffect(() => {
    return clearPendingUpdate;
  }, [clearPendingUpdate]);

  const handleQuantityChange = (nextQuantity: number) => {
    if (!item.id || isSettingQuantity || !Number.isFinite(nextQuantity)) {
      return;
    }

    const normalizedQuantity = Math.max(1, Math.round(nextQuantity));
    setLocalQuantity(normalizedQuantity);
    clearPendingUpdate();

    if (normalizedQuantity === quantity) {
      return;
    }

    updateTimeoutRef.current = setTimeout(() => {
      onQuantitySet(item, normalizedQuantity);
      updateTimeoutRef.current = null;
    }, 250);
  };

  return (
    <article className="flex flex-col gap-300 border-b border-border-secondary bg-base p-300 md:flex-row md:items-center">
      <NextLink className="shrink-0" href={productHref}>
        <Image
          alt={productTitle}
          className="h-850 w-850 rounded-md object-contain"
          height={80}
          src={imageSrc}
          width={80}
        />
      </NextLink>

      <div className="min-w-0 flex-1 space-y-100">
        <Link
          as={NextLink}
          className="block truncate font-semibold text-primary text-sm underline"
          href={productHref}
        >
          {productTitle}
        </Link>
        {item.variant?.title ? (
          <p className="truncate text-fg-secondary text-xs">
            {item.variant.title}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-300 gap-y-100 text-sm">
          {canChangeQuantity ? null : (
            <span className="text-fg-secondary">{quantity} ks</span>
          )}
          {price ? (
            <span className="font-semibold">{price.currentLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-300">
        {canChangeQuantity ? (
          <NumericInput
            allowOverflow={false}
            disabled={!item.id || isSettingQuantity}
            min={1}
            onChange={handleQuantityChange}
            size="sm"
            step={1}
            value={localQuantity}
            className="w-20"
          >
            <NumericInput.Control>
              <NumericInput.DecrementTrigger
                disabled={isSettingQuantity || localQuantity <= 1}
              />
              <NumericInput.Input aria-label={`Množstvo pre ${productTitle}`} />
              <NumericInput.IncrementTrigger disabled={isSettingQuantity} />
            </NumericInput.Control>
          </NumericInput>
        ) : null}
        <Button
          disabled={!canAddToCart}
          icon="token-icon-cart"
          isLoading={isAddingToCart}
          onClick={() => {
            if (itemProduct) {
              onAddToCart(item, itemProduct);
            }
          }}
          size="sm"
          variant="primary"
        >
          Do košíka
        </Button>
        <Button
          aria-label={`Odstrániť ${productTitle} zo zoznamu`}
          disabled={!item.id || isDeleting}
          icon="token-icon-trash"
          isLoading={isDeleting}
          loadingText="Odstraňujem"
          onClick={() => onDelete(item)}
          size="current"
          iconSize="md"
          theme="unstyled"
          variant="danger"
          className="text-danger"
        />
      </div>
    </article>
  );
}
