/**
 * ProductCard — @techsio/ui-kit template.
 *
 * @component ProductCard
 * @componentVersion v1.3.5
 * @skill product-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the product-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ElementType, ReactNode } from "react"
import { Badge, type BadgeProps } from "../atoms/badge"
import { Link, type LinkProps } from "../atoms/link"
import { ProductCard, type ProductCardProps } from "../molecules/product-card"
import { tv } from "../utils"

const styles = tv({
  slots: {
    name: "min-h-0",
    prices: "flex flex-wrap items-baseline gap-product-card-badges",
    currentPrice: "mt-0",
    originalPrice:
      "text-product-card-original-price-fg text-product-card-original-price-size",
    rating: "flex min-w-0 items-end justify-between gap-product-card-badges",
    reviews: "shrink-0 text-sm",
    actions: "grid grid-cols-1 sm:flex sm:flex-wrap",
    action: "w-full sm:w-max",
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

export function ProductCardTemplate<T extends ElementType = "a">({
  image,
  name,
  nameAs,
  href,
  linkAs,
  linkProps,
  price,
  originalPrice,
  originalPriceLabel = "Original price",
  currentPriceLabel = "Current price",
  badges,
  rating,
  stock,
  showActions = true,
  onAddToCart,
  onViewDetails,
  onAddToWishlist,
  cartButtonText = "Add to Cart",
  detailButtonText = "View Details",
  wishlistButtonText = "Add to Wishlist",
  layout = "column",
  className,
}: ProductCardTemplateProps<T>) {
  const slots = styles()
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
        <ProductCard.Name as={nameAs} className={slots.name()}>
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
            <del className={slots.originalPrice()}>
              <span className="sr-only">{originalPriceLabel}: </span>
              {originalPrice}
            </del>
          )}
          {price && (
            <ProductCard.Price className={slots.currentPrice()}>
              <span className="sr-only">{currentPriceLabel}: </span>
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
              size: "sm",
            }}
          />
          {rating.reviewCount !== undefined && (
            <span className={slots.reviews()}>({rating.reviewCount})</span>
          )}
        </div>
      )}

      {stock && (
        <ProductCard.Stock status={stock.status || "in-stock"}>
          {stock.label}
        </ProductCard.Stock>
      )}

      {showActions && (onAddToCart || onViewDetails || onAddToWishlist) && (
        <ProductCard.Actions className={slots.actions()}>
          {onAddToCart && (
            <ProductCard.Button
              buttonVariant="cart"
              className={slots.action()}
              icon={
                stock?.status === "out-of-stock"
                  ? "token-icon-product-card-notify"
                  : "token-icon-cart-button"
              }
              onClick={onAddToCart}
            >
              {cartButtonText}
            </ProductCard.Button>
          )}
          {onViewDetails && (
            <ProductCard.Button
              buttonVariant="detail"
              className={slots.action()}
              icon="token-icon-detail-button"
              onClick={onViewDetails}
            >
              {detailButtonText}
            </ProductCard.Button>
          )}
          {onAddToWishlist && (
            <ProductCard.Button
              buttonVariant="wishlist"
              className={slots.action()}
              icon="token-icon-wishlist-button"
              onClick={onAddToWishlist}
            >
              {wishlistButtonText}
            </ProductCard.Button>
          )}
        </ProductCard.Actions>
      )}
    </ProductCard>
  )
}
