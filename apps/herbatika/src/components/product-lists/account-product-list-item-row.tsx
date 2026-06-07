"use client";

import type { HttpTypes } from "@medusajs/types";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import Image from "next/image";
import NextLink from "next/link";
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants";
import { resolvePriceState } from "@/components/product-card/product-card.pricing";
import type { StoreProductListItem } from "@/lib/storefront/product-lists";

type AccountProductListItemRowProps = {
  canIncrement: boolean;
  isAddingToCart: boolean;
  isIncrementing: boolean;
  item: StoreProductListItem;
  onAddToCart: (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct,
  ) => void;
  onIncrement: (item: StoreProductListItem) => void;
  product: HttpTypes.StoreProduct | null;
};

const resolveQuantity = (item: StoreProductListItem) => {
  return typeof item.quantity === "number" && item.quantity > 0
    ? Math.floor(item.quantity)
    : 1;
};

export function AccountProductListItemRow({
  canIncrement,
  isAddingToCart,
  isIncrementing,
  item,
  onAddToCart,
  onIncrement,
  product,
}: AccountProductListItemRowProps) {
  const itemProduct = product ?? item.product ?? null;
  const productTitle = itemProduct?.title ?? item.product_id ?? "Produkt";
  const productHref = itemProduct?.handle ? `/p/${itemProduct.handle}` : "#";
  const imageSrc = itemProduct?.thumbnail ?? PRODUCT_FALLBACK_IMAGE;
  const price = itemProduct ? resolvePriceState(itemProduct) : null;
  const quantity = resolveQuantity(item);
  const canAddToCart = Boolean(itemProduct);

  return (
    <article className="flex flex-col gap-300 rounded-md border border-border-secondary bg-base p-300 md:flex-row md:items-center">
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
          <span className="text-fg-secondary">{quantity} ks</span>
          {price ? (
            <span className="font-semibold">{price.currentLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-200">
        {canIncrement ? (
          <Button
            disabled={!item.id || isIncrementing}
            icon="token-icon-plus"
            isLoading={isIncrementing}
            onClick={() => onIncrement(item)}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Navýšit
          </Button>
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
          Do košíku
        </Button>
      </div>
    </article>
  );
}
