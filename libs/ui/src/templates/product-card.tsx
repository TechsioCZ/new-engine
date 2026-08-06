/*
 * ProductCard — @techsio/ui-kit template.
 *
 * @component ProductCard
 * @componentVersion v1.0.2
 * @skill product-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the product-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { Badge } from "../atoms/badge"
import type { BadgeProps } from "../atoms/badge"
import { ProductCard } from "../molecules/product-card"
import type { ProductCardProps } from "../molecules/product-card"
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
    status?: Parameters<typeof ProductCard.Stock>[0]["status"]
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

type ProductBadgesProps = Pick<ProductCardTemplateProps, "badges">

const renderBadge = (badge: BadgeProps) => {
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
}

const ProductBadges = ({ badges }: ProductBadgesProps) => {
  if (badges === undefined || badges.length === 0) {
    return null
  }

  return <ProductCard.Badges>{badges.map(renderBadge)}</ProductCard.Badges>
}

type ProductPriceProps = Pick<
  ProductCardTemplateProps,
  "originalPrice" | "price"
>

const ProductPrice = ({ originalPrice, price }: ProductPriceProps) => {
  const hasOriginalPrice = originalPrice !== undefined && originalPrice !== ""
  const hasPrice = price !== undefined && price !== ""

  if (!(hasOriginalPrice || hasPrice)) {
    return null
  }

  return (
    <div className="flex items-baseline gap-100">
      {hasOriginalPrice && (
        <span className="line-through">{originalPrice}</span>
      )}
      {hasPrice && <ProductCard.Price>{price}</ProductCard.Price>}
    </div>
  )
}

interface ProductRatingProps {
  rating: ProductCardTemplateProps["rating"]
}

const ProductRating = ({ rating }: ProductRatingProps) => {
  if (rating === undefined) {
    return null
  }

  const hasReviewCount =
    rating.reviewCount !== undefined &&
    rating.reviewCount !== 0 &&
    !Number.isNaN(rating.reviewCount)

  return (
    <div className="flex items-center gap-100">
      <ProductCard.Rating
        rating={{
          count: rating.count,
          value: rating.value,
        }}
      />
      {hasReviewCount && (
        <span className="text-sm">({rating.reviewCount})</span>
      )}
    </div>
  )
}

interface ProductStockProps {
  stock: ProductCardTemplateProps["stock"]
}

const ProductStock = ({ stock }: ProductStockProps) => {
  if (stock === undefined) {
    return null
  }

  return (
    <ProductCard.Stock status={stock.status ?? "in-stock"}>
      {stock.label}
    </ProductCard.Stock>
  )
}

type ProductActionsProps = Pick<
  ProductCardTemplateProps,
  | "cartButtonText"
  | "detailButtonText"
  | "onAddToCart"
  | "onAddToWishlist"
  | "onViewDetails"
  | "showActions"
  | "wishlistButtonText"
>

const ProductActions = ({
  cartButtonText,
  detailButtonText,
  onAddToCart,
  onAddToWishlist,
  onViewDetails,
  showActions,
  wishlistButtonText,
}: ProductActionsProps) => {
  const hasActions =
    onAddToCart !== undefined ||
    onViewDetails !== undefined ||
    onAddToWishlist !== undefined

  if (showActions !== true || !hasActions) {
    return null
  }

  return (
    <ProductCard.Actions>
      {onAddToCart !== undefined && (
        <ProductCard.Button
          buttonVariant="cart"
          icon="token-icon-cart-button"
          onClick={onAddToCart}
        >
          {cartButtonText}
        </ProductCard.Button>
      )}
      {onViewDetails !== undefined && (
        <ProductCard.Button
          buttonVariant="detail"
          icon="token-icon-detail-button"
          onClick={onViewDetails}
        >
          {detailButtonText}
        </ProductCard.Button>
      )}
      {onAddToWishlist !== undefined && (
        <ProductCard.Button
          buttonVariant="wishlist"
          icon="token-icon-wishlist-button"
          onClick={onAddToWishlist}
        >
          {wishlistButtonText}
        </ProductCard.Button>
      )}
    </ProductCard.Actions>
  )
}

export const ProductCardTemplate = ({
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
}: ProductCardTemplateProps) => (
  <ProductCard className={className} layout={layout}>
    {image !== undefined && (
      <ProductCard.Image alt={image.alt} src={image.src} />
    )}

    <ProductBadges badges={badges} />

    {name !== undefined && name !== "" && (
      <ProductCard.Name>{name}</ProductCard.Name>
    )}

    <ProductPrice originalPrice={originalPrice} price={price} />

    <ProductRating rating={rating} />

    <ProductStock stock={stock} />

    <ProductActions
      cartButtonText={cartButtonText}
      detailButtonText={detailButtonText}
      onAddToCart={onAddToCart}
      onAddToWishlist={onAddToWishlist}
      onViewDetails={onViewDetails}
      showActions={showActions}
      wishlistButtonText={wishlistButtonText}
    />
  </ProductCard>
)
