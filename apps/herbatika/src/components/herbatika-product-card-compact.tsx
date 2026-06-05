"use client";

import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextImage from "next/image";
import NextLink from "next/link";
import {
  type HerbatikaProductCardBaseProps,
  useHerbatikaProductCardState,
} from "@/components/herbatika-product-card.shared";

export type HerbatikaProductCardCompactProps = HerbatikaProductCardBaseProps & {
  onCompactImageError?: (
    product: HerbatikaProductCardBaseProps["product"],
  ) => void;
};

export function HerbatikaProductCardCompact({
  product,
  onCompactImageError,
  onProductHoverEnd,
  onProductHoverStart,
}: HerbatikaProductCardCompactProps) {
  const { handleImageError, imageSrc, price, productHref, title } =
    useHerbatikaProductCardState(product, () => {
      onCompactImageError?.(product);
    });

  return (
    <ProductCard>
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
          className="w-full object-contain"
          onError={handleImageError}
        />
      </NextLink>

      <div className="mt-250 flex flex-col gap-150">
        <ProductCard.Name className="text-md leading-snug font-bold text-primary">
          <NextLink className="hover:text-primary-hover" href={productHref}>
            {title}
          </NextLink>
        </ProductCard.Name>

        <ProductCard.Price className="text-lg leading-tight">
          {price.currentLabel}
        </ProductCard.Price>
      </div>
    </ProductCard>
  );
}
