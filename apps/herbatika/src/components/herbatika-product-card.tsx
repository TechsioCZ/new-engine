"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextLink from "next/link";
import { resolveDescription } from "@/components/product-card/product-card.description";
import { resolveFlags } from "@/components/product-card/product-card.flags";
import {
  resolveDiscountLabel,
  resolvePriceState,
} from "@/components/product-card/product-card.pricing";
import { resolveThumbnail } from "@/components/product-card/product-card.thumbnail";

export { getProductPriceLabel } from "@/components/product-card/product-card.pricing";

type HerbatikaProductCardProps = {
  product: HttpTypes.StoreProduct;
  isAdding: boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
  descriptionOverride?: string | null;
};

export function HerbatikaProductCard({
  product,
  isAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
  descriptionOverride,
}: HerbatikaProductCardProps) {
  const productHref = product.handle ? `/p/${product.handle}` : "/#";
  const defaultVariantId = product.variants?.[0]?.id;
  const price = resolvePriceState(product);
  const discountLabel = resolveDiscountLabel(price);
  const flags = resolveFlags(product, Boolean(discountLabel));
  const title = product.title || "Produkt";
  const description =
    descriptionOverride && descriptionOverride.trim().length > 0
      ? descriptionOverride
      : resolveDescription(product);

  return (
    <ProductCard className="h-full max-w-none rounded-2xl border-transparent bg-surface p-500 pb-550 shadow-none">
      <div className="relative pb-250">
        <Link
          as={NextLink}
          className="block"
          href={productHref}
          onBlur={() => onProductHoverEnd?.(product)}
          onFocus={() => onProductHoverStart?.(product)}
          onMouseEnter={() => onProductHoverStart?.(product)}
          onMouseLeave={() => onProductHoverEnd?.(product)}
        >
          <ProductCard.Image
            alt={title}
            className="w-full object-cover"
            src={resolveThumbnail(product)}
          />
        </Link>

        {flags.length > 0 ? (
          <ProductCard.Badges className="absolute top-0 left-0 flex-col gap-100">
            {flags.map((flag) => (
              <Badge
                className="rounded-md px-200 py-100 text-xs leading-tight font-bold"
                key={`${product.id}-${flag.label}`}
                variant={flag.variant}
              >
                {flag.label}
              </Badge>
            ))}
          </ProductCard.Badges>
        ) : null}

        {discountLabel ? (
          <div className="absolute right-0 bottom-0 rounded-md bg-tertiary px-200 py-200">
            <span className="text-xs leading-tight font-bold text-fg-reverse">
              {discountLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex h-full flex-col gap-450">
        <div className="flex flex-col gap-250">
          <ProductCard.Name className="min-h-750 text-lg leading-snug font-semibold text-fg-primary">
            <Link as={NextLink} className="hover:text-primary" href={productHref}>
              {title}
            </Link>
          </ProductCard.Name>

          {description ? (
            <p className="line-clamp-3 min-h-800 whitespace-pre-line text-xs leading-normal text-fg-secondary">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-300">
          <div className="flex min-h-750 flex-col justify-end">
            {price.originalLabel ? (
              <span className="text-xs leading-normal text-fg-tertiary line-through">
                {price.originalLabel}
              </span>
            ) : null}
            <ProductCard.Price className="text-xl leading-tight font-bold text-fg-primary">
              {price.currentLabel}
            </ProductCard.Price>
          </div>

          <ProductCard.Actions className="mt-0 shrink-0">
            <Button
              className="inline-flex h-750 min-w-900 items-center gap-200 rounded-md border border-primary bg-primary px-450 text-sm leading-normal font-medium text-fg-reverse hover:bg-primary-hover"
              disabled={!defaultVariantId}
              icon="token-icon-cart"
              isLoading={isAdding}
              onClick={() => {
                void onAddToCart(product);
              }}
              size="current"
              type="button"
            >
              Do košíka
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  );
}
