"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import NextImage from "next/image"
import NextLink from "next/link"
import {
  type HerbatikaProductCardBaseProps,
  useHerbatikaProductCardState,
} from "@/components/herbatika-product-card.shared"
import { resolveDescription } from "@/components/product-card/product-card.description"
import { resolveFlags } from "@/components/product-card/product-card.flags"
import { resolveDiscountLabel } from "@/components/product-card/product-card.pricing"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import { useRequiredStorefrontText } from "@/lib/storefront/storefront-text-provider"
import { STOREFRONT_TEXT_KEYS } from "@/lib/storefront/storefront-texts"

export type HerbatikaProductCardProps = HerbatikaProductCardBaseProps & {
  isAdding: boolean
  onAddToCart: (
    product: HerbatikaProductCardBaseProps["product"]
  ) => Promise<void> | void
  descriptionOverride?: string | null
}

export function HerbatikaProductCard(props: HerbatikaProductCardProps) {
  const { product, onProductHoverStart, onProductHoverEnd } = props
  const { descriptionOverride, isAdding, onAddToCart } = props
  const addToCartLabel = useRequiredStorefrontText(
    STOREFRONT_TEXT_KEYS.cartAddToCart
  )
  const { handleImageError, imageSrc, price, productHref, title } =
    useHerbatikaProductCardState(product)
  const defaultVariant = product.variants?.[0] ?? null
  const defaultVariantInventory = resolveVariantInventoryState(defaultVariant)
  const canAddToCart =
    defaultVariantInventory.isPurchasable &&
    typeof price.currentAmount === "number"
  const discountLabel = resolveDiscountLabel(price)
  const flags = resolveFlags(product, Boolean(discountLabel))
  const description =
    descriptionOverride && descriptionOverride.trim().length > 0
      ? descriptionOverride
      : resolveDescription(product)

  return (
    <ProductCard className="h-full min-w-0">
      <div className="relative flex justify-center pb-250">
        <NextLink
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
        </NextLink>

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
            <NextLink className="hover:text-primary" href={productHref}>
              {title}
            </NextLink>
          </ProductCard.Name>

          {description ? (
            <p className="line-clamp-3 whitespace-pre-line font-verdana text-fg-secondary text-xs leading-normal sm:min-h-800">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex min-h-product-card-label items-end justify-between gap-200 sm:gap-300">
          <div className="flex h-full flex-col justify-center font-verdana leading-none">
            {price.originalLabel ? (
              <span className="text-fg-tertiary text-xs line-through">
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
                runDetachedPromise(onAddToCart(product))
              }}
              size="sm"
              type="button"
              variant="primary"
            >
              {addToCartLabel}
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  )
}
