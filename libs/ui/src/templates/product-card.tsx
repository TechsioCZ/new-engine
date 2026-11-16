/**
 * ProductCard — @techsio/ui-kit template.
 *
 * @component ProductCard
 * @componentVersion v2.0.0
 * @skill product-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the product-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ElementType, ReactNode } from "react"
import { Badge, type BadgeProps } from "../atoms/badge"
import { Link, type LinkProps } from "../atoms/link"
import { useUiMessages } from "../messages/ui-messages-provider"
import { ProductCard, type ProductCardProps } from "../molecules/product-card"
import { tv } from "../utils"

const styles = tv({
  slots: {
    prices: "flex flex-wrap items-baseline gap-product-card-badges",
    rating: "flex items-center gap-product-card-badges",
  },
})

export type ProductCardTemplateProps<T extends ElementType = "a"> = Pick<
  ProductCardProps,
  "layout"
> & {
  image?: {
    src: string
    alt: string
  }
  name?: ReactNode
  /** Product destination; the name remains a heading containing a real link. */
  href?: string
  linkAs?: T
  linkProps?: Omit<LinkProps<NoInfer<T>>, "as" | "href" | "children" | "size">
  /** Heading level of the name, to fit the page outline (`h3` by default). */
  nameAs?: "h2" | "h3" | "h4" | "h5" | "h6"
  price?: string
  originalPrice?: string
  originalPriceLabel?: string
  currentPriceLabel?: string
  badges?: BadgeProps[]
  rating?: {
    value: number
    /** Total number of rating items to display (e.g., 5 for 5 stars) */
    count?: number
    /** Number of reviews/ratings from users */
    reviewCount?: number
  }
  stock?: {
    status?: "in-stock" | "limited-stock" | "out-of-stock"
    label: string
  }
  showActions?: boolean
  onAddToCart?: () => void
  onViewDetails?: () => void
  onAddToWishlist?: () => void
  cartButtonText?: string
  detailButtonText?: string
  wishlistButtonText?: string
  className?: string
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each catalog fallback text adds one branch to the template.
export function ProductCardTemplate<T extends ElementType = "a">({
  image,
  name,
  nameAs,
  href,
  linkAs,
  linkProps,
  price,
  originalPrice,
  originalPriceLabel,
  currentPriceLabel,
  badges,
  rating,
  stock,
  showActions = true,
  onAddToCart,
  onViewDetails,
  onAddToWishlist,
  cartButtonText,
  detailButtonText,
  wishlistButtonText,
  layout = "column",
  className,
}: ProductCardTemplateProps<T>) {
  const slots = styles()
  const messages = useUiMessages()
  const NameLink = Link<ElementType>
  return (
    <ProductCard className={className} layout={layout}>
      {image && <ProductCard.Image alt={image.alt} src={image.src} />}

      {badges && badges.length > 0 && (
        <ProductCard.Badges>
          {badges.map(({ key, ...badge }, index) => (
            <Badge {...badge} key={key ?? index} />
          ))}
        </ProductCard.Badges>
      )}

      {name !== undefined && name !== null && name !== false && (
        <ProductCard.Name as={nameAs}>
          {href ? (
            <NameLink {...linkProps} as={linkAs} href={href} size="current">
              {name}
            </NameLink>
          ) : (
            name
          )}
        </ProductCard.Name>
      )}

      {(price || originalPrice) && (
        <div className={slots.prices()}>
          {originalPrice && (
            <del>
              <span className="sr-only">
                {originalPriceLabel ?? messages.productCard.originalPrice}:{" "}
              </span>
              {originalPrice}
            </del>
          )}
          {price && (
            <ProductCard.Price>
              <span className="sr-only">
                {currentPriceLabel ?? messages.productCard.currentPrice}:{" "}
              </span>
              {price}
            </ProductCard.Price>
          )}
        </div>
      )}

      {rating && (
        <div className={slots.rating()}>
          <ProductCard.Rating
            rating={{
              value: rating.value,
              count: rating.count,
              displayOnly: true,
            }}
          />
          {rating.reviewCount !== undefined && (
            <span className="text-sm">({rating.reviewCount})</span>
          )}
        </div>
      )}

      {stock && (
        <ProductCard.Stock status={stock.status || "in-stock"}>
          {stock.label}
        </ProductCard.Stock>
      )}

      {showActions && (onAddToCart || onViewDetails || onAddToWishlist) && (
        <ProductCard.Actions>
          {onAddToCart && (
            <ProductCard.Button
              action="cart"
              icon="token-icon-cart-button"
              onClick={onAddToCart}
            >
              {cartButtonText ?? messages.productCard.addToCart}
            </ProductCard.Button>
          )}
          {onViewDetails && (
            <ProductCard.Button
              action="detail"
              icon="token-icon-detail-button"
              onClick={onViewDetails}
            >
              {detailButtonText ?? messages.productCard.viewDetails}
            </ProductCard.Button>
          )}
          {onAddToWishlist && (
            <ProductCard.Button
              action="wishlist"
              icon="token-icon-wishlist-button"
              onClick={onAddToWishlist}
            >
              {wishlistButtonText ?? messages.productCard.addToWishlist}
            </ProductCard.Button>
          )}
        </ProductCard.Actions>
      )}
    </ProductCard>
  )
}
