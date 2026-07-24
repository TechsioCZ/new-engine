import { Badge, type BadgeProps } from "../atoms/badge"
import { ProductCard, type ProductCardProps } from "../molecules/product-card"
import { slugify } from "../utils"

export interface ProductCardTemplateProps extends Pick<
  ProductCardProps,
  "layout"
> {
  image?: {
    src: string
    alt: string
  }
  name?: string | undefined
  price?: string | undefined
  originalPrice?: string | undefined
  badges?: BadgeProps[] | undefined
  rating?: {
    value: number
    /** Total number of rating items to display (e.g., 5 for 5 stars) */
    count?: number | undefined
    /** Number of reviews/ratings from users */
    reviewCount?: number | undefined
  }
  stock?: {
    status?: "in-stock" | "limited-stock" | "out-of-stock" | undefined
    label: string
  }
  showActions?: boolean | undefined
  onAddToCart?: (() => void) | undefined
  onViewDetails?: (() => void) | undefined
  onAddToWishlist?: (() => void) | undefined
  cartButtonText?: string | undefined
  detailButtonText?: string | undefined
  wishlistButtonText?: string | undefined
  className?: string | undefined
}

export function ProductCardTemplate({
  image,
  name,
  price,
  originalPrice,
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
}: ProductCardTemplateProps) {
  return (
    <ProductCard className={className} layout={layout}>
      {image && <ProductCard.Image alt={image.alt} src={image.src} />}

      {badges && badges.length > 0 && (
        <ProductCard.Badges>
          {badges.map((badge) => {
            if (badge.variant === "dynamic") {
              return (
                <Badge
                  bgColor={badge.bgColor}
                  borderColor={badge.borderColor}
                  fgColor={badge.fgColor}
                  key={slugify(badge.children)}
                  variant="dynamic"
                >
                  {badge.children}
                </Badge>
              )
            }

            return (
              <Badge key={slugify(badge.children)} variant={badge.variant}>
                {badge.children}
              </Badge>
            )
          })}
        </ProductCard.Badges>
      )}

      {name && <ProductCard.Name>{name}</ProductCard.Name>}

      {(price || originalPrice) && (
        <div className="flex items-baseline gap-100">
          {originalPrice && (
            <span className="line-through">{originalPrice}</span>
          )}
          {price && <ProductCard.Price>{price}</ProductCard.Price>}
        </div>
      )}

      {rating && (
        <div className="flex items-center gap-100">
          <ProductCard.Rating
            rating={{
              value: rating.value,
              count: rating.count,
            }}
          />
          {rating.reviewCount && (
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
              buttonVariant="cart"
              icon="token-icon-cart-button"
              onClick={onAddToCart}
            >
              {cartButtonText}
            </ProductCard.Button>
          )}
          {onViewDetails && (
            <ProductCard.Button
              buttonVariant="detail"
              icon="token-icon-detail-button"
              onClick={onViewDetails}
            >
              {detailButtonText}
            </ProductCard.Button>
          )}
          {onAddToWishlist && (
            <ProductCard.Button
              buttonVariant="wishlist"
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
