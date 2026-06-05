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
  const canAddToCart =
    Boolean(defaultVariantId) && typeof price.currentAmount === "number";
  const discountLabel = resolveDiscountLabel(price);
  const flags = resolveFlags(product, Boolean(discountLabel));
  const description =
    descriptionOverride && descriptionOverride.trim().length > 0
      ? descriptionOverride
      : resolveDescription(product);

  return (
    <ProductCard className="h-full min-w-0">
      <div className="flex relative justify-center pb-250">
        <NextLink
          className="block w-full"
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
            className="h-product-card-image w-full object-contain"
            onError={handleImageError}
          />
        </NextLink>

        {flags.length > 0 ? (
          <ProductCard.Badges className="absolute top-0 left-0 flex-col items-start gap-100 font-verdana">
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
          <Badge variant="discount" size="md" className="absolute py-200 bottom-250 text-discount-size font-verdana font-bold rounded-sm right-0">{discountLabel}</Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-450">
        <div className="flex flex-col gap-450">
          <ProductCard.Name className="sm:min-h-800">
            <NextLink className="hover:text-primary" href={productHref}>
              {title}
            </NextLink>
          </ProductCard.Name>

          {description ? (
            <p className="line-clamp-3 whitespace-pre-line text-xs font-verdana leading-normal text-fg-secondary sm:min-h-800">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex min-h-product-card-label gap-200 items-end justify-between sm:gap-300">
          <div className="flex h-full flex-col leading-none font-verdana justify-center">
            {price.originalLabel ? (
              <span className="text-xs text-fg-tertiary line-through">
                {price.originalLabel}
              </span>
            ) : null}
            <ProductCard.Price className="leading-none">
              {price.currentLabel}
            </ProductCard.Price>
          </div>

          <ProductCard.Actions className="shrink-0 justify-end">
            <Button
              className="min-h-750 rounded-sm"
              disabled={!canAddToCart}
              icon="token-icon-cart"
              iconSize="2xl"
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
