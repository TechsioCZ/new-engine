"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import NextImage from "next/image"
import { useTranslations } from "next-intl"
import {
  type HerbatikaProductCardBaseProps,
  useHerbatikaProductCardState,
} from "@/components/herbatika-product-card.shared"
import { resolveDescription } from "@/components/product-card/product-card.description"
import { resolveFlags } from "@/components/product-card/product-card.flags"
import { resolveDiscountLabel } from "@/components/product-card/product-card.pricing"
import { ProductCardPriceBlock } from "@/components/product-card/product-card-price-block"
import { StorefrontLink } from "@/components/storefront-link"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"

export type HerbatikaProductCardProps = HerbatikaProductCardBaseProps & {
  isAdding: boolean
  onAddToCart: (
    product: HerbatikaProductCardBaseProps["product"]
  ) => Promise<void> | void
  descriptionOverride?: string | null
}

export function HerbatikaProductCard(props: HerbatikaProductCardProps) {
  const { product, onProductHoverStart, onProductHoverEnd } = props
  const { descriptionOverride, isAdding, onAddToCart, publicSlug } = props
  const { code: market } = useMarketContext()
  const tCart = useTranslations("cart")
  const tCatalog = useTranslations("catalog")
  const { handleImageError, imageSrc, price, productHref, title } =
    useHerbatikaProductCardState(product, {
      market,
      priceUnavailableLabel: tCatalog("product_card.price_on_request"),
      publicSlug,
    })
  const defaultVariant = product.variants?.[0] ?? null
  const defaultVariantInventory = resolveVariantInventoryState(defaultVariant)
  const canAddToCart =
    defaultVariantInventory.isPurchasable &&
    typeof price.currentAmount === "number"
  const discountLabel = resolveDiscountLabel(price)
  const flags = resolveFlags(product, Boolean(discountLabel), {
    action: tCatalog("filters.status.action"),
    new: tCatalog("filters.status.new"),
    tip: tCatalog("filters.status.tip"),
  })
  const description =
    descriptionOverride && descriptionOverride.trim().length > 0
      ? descriptionOverride
      : resolveDescription(product)

  return (
    <ProductCard className="h-full min-w-0">
      <div className="relative flex justify-center pb-250">
        {productHref ? (
          <StorefrontLink
            className="block w-full"
            href={productHref}
            onBlur={() => onProductHoverEnd?.(product)}
            onFocus={() => onProductHoverStart?.(product)}
            onMouseEnter={() => onProductHoverStart?.(product)}
            onMouseLeave={() => onProductHoverEnd?.(product)}
          >
            <ProductCard.Image
              alt={title}
              as={NextImage}
              className="h-product-card-image w-full object-contain"
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
            className="h-product-card-image w-full object-contain"
            height={320}
            onError={handleImageError}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            src={imageSrc}
            width={320}
          />
        )}

        {flags.length > 0 ? (
          <ProductCard.Badges className="absolute top-0 left-0 flex-col items-start gap-100 font-verdana">
            {flags.map((flag) => (
              <Badge
                className="font-bold leading-tight"
                key={`${product.id}-${flag.label}`}
                variant={flag.variant}
              >
                {flag.label}
              </Badge>
            ))}
          </ProductCard.Badges>
        ) : null}

        {discountLabel ? (
          <Badge
            className="absolute right-0 bottom-250 rounded-sm py-200 font-bold font-verdana text-discount-size"
            size="md"
            variant="discount"
          >
            {discountLabel}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-450">
        <div className="flex flex-col gap-450">
          <ProductCard.Name className="sm:min-h-800">
            {productHref ? (
              <StorefrontLink className="hover:text-primary" href={productHref}>
                {title}
              </StorefrontLink>
            ) : (
              title
            )}
          </ProductCard.Name>

          {description ? (
            <p className="line-clamp-3 whitespace-pre-line font-verdana text-fg-secondary text-xs leading-normal sm:min-h-800">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex min-h-product-card-label items-end justify-between gap-200 sm:gap-300">
          <ProductCardPriceBlock className="h-full" price={price} />

          <ProductCard.Actions className="shrink-0 justify-end">
            <Button
              className="min-h-750 rounded-sm"
              disabled={!canAddToCart}
              icon="token-icon-cart"
              iconSize="2xl"
              isLoading={isAdding}
              loadingText={tCart("adding_to_cart")}
              onClick={() => {
                runDetachedPromise(onAddToCart(product))
              }}
              size="sm"
              type="button"
              variant="primary"
            >
              {tCart("add_to_cart")}
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  )
}
