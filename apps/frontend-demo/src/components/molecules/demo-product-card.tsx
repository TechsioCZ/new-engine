import { Badge } from "@techsio/ui-kit/atoms/badge"
import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Rating } from "@techsio/ui-kit/atoms/rating"
import type { RatingProps } from "@techsio/ui-kit/atoms/rating"
import { NumericInputTemplate } from "@techsio/ui-kit/templates/numeric-input"
import { slugify, tv } from "@techsio/ui-kit/utils"
import Image from "next/image"
import { useId } from "react"
import type { HTMLAttributes, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

//object-cover aspect-product-card-image
const productCard = tv({
  /* Define compound styles for slots */
  compoundSlots: [
    {
      class: ["col-start-2"],
      layout: "row",
      slots: [
        "nameSlot",
        "priceSlot",
        "stockStatusSlot",
        "badgesSlot",
        "ratingSlot",
        "buttonsSlot",
      ],
    },
  ],
  defaultVariants: {
    buttonLayout: "horizontal",
    layout: "column",
  },
  slots: {
    badgesSlot: "flex flex-wrap gap-pc-box",
    base: [
      "h-full rounded-pc p-pc-padding",
      "border-(length:--border-pc-width) max-w-pc-max border-pc-border bg-pc shadow-sm",
    ],
    buttonsSlot: "flex w-fit flex-wrap",
    cartButton:
      "w-max items-center bg-btn-cart text-btn-cart-fg hover:bg-btn-cart-hover",
    detailButton:
      "w-max bg-btn-detail text-btn-detail-fg hover:bg-btn-detail-hover",
    imageSlot: "aspect-pc-image h-full rounded-pc-image object-cover",
    nameSlot: "truncate text-pc-name-fg text-pc-name-size",
    priceSlot: "text-pc-price-fg text-pc-price-size",
    ratingSlot: "flex items-center",
    stockStatusSlot: "text-pc-stock-fg text-pc-stock-size",
    wishlistButton:
      "w-max bg-btn-wishlist text-btn-wishlist-fg hover:bg-btn-wishlist-hover",
  },
  variants: {
    // variant for layout of the buttons
    buttonLayout: {
      horizontal: {
        buttonsSlot: "justify-center gap-2",
      },
      vertical: {
        buttonsSlot: "flex-col gap-2",
      },
    },
    // variant for layout of the card
    layout: {
      column: {
        badgesSlot: "order-badges",
        base: ["grid grid-cols-1 gap-pc-col-layout"],
        buttonsSlot: "order-buttons",
        imageSlot: "order-image w-full",
        nameSlot: "order-name",
        priceSlot: "order-price",
        ratingSlot: "order-ratings",
        stockStatusSlot: "order-stock",
      },
      row: {
        base: "grid grid-cols-[auto_1fr] gap-x-pc-row-layout",
        imageSlot: "row-span-6",
      },
    },
  },
})

type ProductCardVariants = VariantProps<typeof productCard>

export interface ProductCardProps
  extends ProductCardVariants, HTMLAttributes<HTMLDivElement> {
  imageUrl: string
  name: string
  price: string
  stockStatus?: string
  badges?: BadgeProps[]
  rating?: RatingProps
  // Set prepared button options
  hasCartButton?: boolean
  hasDetailButton?: boolean
  hasWishlistButton?: boolean
  onCartClick?: () => void
  onDetailClick?: () => void
  onWishlistClick?: () => void
  cartButtonText?: string
  detailButtonText?: string
  wishlistButtonText?: string
  numericInput?: boolean
  customButtons?: ReactNode
}

const EMPTY_BADGES: BadgeProps[] = []

export const DemoProductCard = ({
  imageUrl,
  name,
  price,
  stockStatus,
  badges = EMPTY_BADGES,
  hasCartButton,
  hasDetailButton,
  hasWishlistButton,
  cartButtonText = "Add to cart",
  detailButtonText = "Detail",
  wishlistButtonText = "Wishlist",
  onCartClick,
  onDetailClick,
  onWishlistClick,
  numericInput,
  rating,
  className,
  layout,
  buttonLayout,
  customButtons,
  ...props
}: ProductCardProps) => {
  const hasActionButtons =
    hasCartButton === true ||
    hasDetailButton === true ||
    hasWishlistButton === true
  const shouldRenderButtons = hasActionButtons || customButtons !== undefined
  const productCardId = useId()

  const {
    base,
    imageSlot,
    nameSlot,
    priceSlot,
    badgesSlot,
    ratingSlot,
    buttonsSlot,
    stockStatusSlot,
    cartButton,
    detailButton,
    wishlistButton,
  } = productCard({ buttonLayout, layout })

  return (
    <div className={base({ className, layout })} {...props}>
      {/* Optimized Next.js Image */}
      <div className={`relative ${imageSlot({ layout })}`}>
        <Image
          alt={name}
          className="object-cover"
          fill
          loading="lazy"
          placeholder="empty"
          quality={20}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 20vw, 15vw"
          src={imageUrl}
        />
      </div>

      {/* Elements with grid positioning based on layout */}
      <h3 className={nameSlot({ layout })}>{name}</h3>

      {rating !== undefined && (
        <div className={ratingSlot({ layout })}>
          <Rating {...rating} />
        </div>
      )}

      {badges.length > 0 && (
        <div className={badgesSlot({ layout })}>
          {badges.map((badge) => (
            <Badge
              key={`${productCardId}-${slugify(badge.children)}-${
                badge.variant
              }`}
              {...badge}
            >
              {badge.children}
            </Badge>
          ))}
        </div>
      )}

      {stockStatus !== undefined && (
        <p className={stockStatusSlot({ layout })}>{stockStatus}</p>
      )}

      <p className={priceSlot({ layout })}>{price}</p>

      {shouldRenderButtons && (
        <div className={buttonsSlot({ buttonLayout })}>
          {hasCartButton === true && (
            <div className="flex gap-pc-box">
              {numericInput === true && <NumericInputTemplate />}
              <Button
                className={cartButton()}
                icon="token-icon-cart"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onCartClick?.()
                }}
                size="sm"
              >
                {cartButtonText}
              </Button>
            </div>
          )}
          {hasDetailButton === true && (
            <Button
              className={detailButton()}
              icon="token-icon-eye"
              onClick={onDetailClick}
              size="sm"
            >
              {detailButtonText}
            </Button>
          )}
          {hasWishlistButton === true && (
            <Button
              className={wishlistButton()}
              icon="token-icon-heart"
              onClick={onWishlistClick}
              size="sm"
            >
              {wishlistButtonText}
            </Button>
          )}
          {customButtons}
        </div>
      )}
    </div>
  )
}
