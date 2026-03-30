"use client";
import NextImage from "next/image";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextLink from "next/link";
import {
  type HerbatikaProductCardBaseProps,
  useHerbatikaProductCardState,
} from "@/components/herbatika-product-card.shared";
import { resolveDescription } from "@/components/product-card/product-card.description";
import { resolveFlags } from "@/components/product-card/product-card.flags";
import { resolveDiscountLabel } from "@/components/product-card/product-card.pricing";

export { getProductPriceLabel } from "@/components/product-card/product-card.pricing";

export type HerbatikaProductCardProps = HerbatikaProductCardBaseProps & {
  isAdding: boolean;
  onAddToCart: (
    product: HerbatikaProductCardBaseProps["product"],
  ) => Promise<void> | void;
  descriptionOverride?: string | null;
};

export function HerbatikaProductCard(props: HerbatikaProductCardProps) {
  const { product, onProductHoverStart, onProductHoverEnd } = props;
  const { descriptionOverride, isAdding, onAddToCart } = props;
  const { handleImageError, imageSrc, price, productHref, title } =
    useHerbatikaProductCardState(product);
  const defaultVariantId = product.variants?.[0]?.id;
  const discountLabel = resolveDiscountLabel(price);
  const flags = resolveFlags(product, Boolean(discountLabel));
  const description =
    descriptionOverride && descriptionOverride.trim().length > 0
      ? descriptionOverride
      : resolveDescription(product);

  return (
    <ProductCard className="h-full">
      <div className="relative pb-250">
        <NextLink
          className="block"
          href={productHref}
          onBlur={() => onProductHoverEnd?.(product)}
          onFocus={() => onProductHoverStart?.(product)}
          onMouseEnter={() => onProductHoverStart?.(product)}
          onMouseLeave={() => onProductHoverEnd?.(product)}
        >
          <ProductCard.Image
            as={NextImage}
            alt={title}
            src={imageSrc}
            width={320}
            height={320}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            onError={handleImageError}
          />
        </NextLink>

        {flags.length > 0 ? (
          <ProductCard.Badges className="absolute top-0 left-0 flex-col">
            {flags.map((flag) => (
              <Badge
                className="leading-tight font-bold"
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
          <ProductCard.Name className="min-h-750 leading-snug">
            <NextLink className="hover:text-primary" href={productHref}>
              {title}
            </NextLink>
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
            <ProductCard.Price className="leading-tight">
              {price.currentLabel}
            </ProductCard.Price>
          </div>

          <ProductCard.Actions className="shrink-0">
            <Button
              className="min-w-900"
              disabled={!defaultVariantId}
              icon="token-icon-cart"
              isLoading={isAdding}
              onClick={() => {
                void onAddToCart(product);
              }}
              size="sm"
              type="button"
              variant="primary"
            >
              Do košíka
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  );
}
