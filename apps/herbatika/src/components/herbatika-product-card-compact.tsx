"use client"

import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import NextImage from "next/image"
import { useTranslations } from "next-intl"
import {
  type HerbatikaProductCardBaseProps,
  useHerbatikaProductCardState,
} from "@/components/herbatika-product-card.shared"
import { ProductCardPriceBlock } from "@/components/product-card/product-card-price-block"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export type HerbatikaProductCardCompactProps = HerbatikaProductCardBaseProps & {
  onCompactImageError?: (
    product: HerbatikaProductCardBaseProps["product"]
  ) => void
}

export function HerbatikaProductCardCompact({
  product,
  onCompactImageError,
  onProductHoverEnd,
  onProductHoverStart,
  publicSlug,
}: HerbatikaProductCardCompactProps) {
  const { code: market } = useMarketContext()
  const tCatalog = useTranslations("catalog")
  const { handleImageError, imageSrc, price, productHref, title } =
    useHerbatikaProductCardState(product, {
      market,
      priceUnavailableLabel: tCatalog("product_card.price_on_request"),
      publicSlug,
      onImageError: () => {
        onCompactImageError?.(product)
      },
    })

  return (
    <ProductCard className="h-full min-w-0">
      {productHref ? (
        <StorefrontLink
          className="block"
          href={productHref}
          onBlur={() => onProductHoverEnd?.(product)}
          onFocus={() => onProductHoverStart?.(product)}
          onMouseEnter={() => onProductHoverStart?.(product)}
          onMouseLeave={() => onProductHoverEnd?.(product)}
        >
          <ProductCard.Image
            alt={title}
            as={NextImage}
            className="w-full object-contain"
            height={320}
            onError={handleImageError}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            src={imageSrc}
            width={320}
          />
        </StorefrontLink>
      ) : (
        <ProductCard.Image
          alt={title}
          as={NextImage}
          className="w-full object-contain"
          height={320}
          onError={handleImageError}
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          src={imageSrc}
          width={320}
        />
      )}

      <div className="mt-250 flex h-full flex-col gap-150">
        <ProductCard.Name className="font-bold text-md text-primary leading-snug">
          {productHref ? (
            <StorefrontLink
              className="hover:text-primary-hover"
              href={productHref}
            >
              {title}
            </StorefrontLink>
          ) : (
            title
          )}
        </ProductCard.Name>

        <ProductCardPriceBlock className="mt-auto" price={price} />
      </div>
    </ProductCard>
  )
}
