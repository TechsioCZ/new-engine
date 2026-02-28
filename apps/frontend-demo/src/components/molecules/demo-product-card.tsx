import { Badge, type BadgeProps } from "@ui/atoms/badge"
import { Button } from "@ui/atoms/button"
import { NumericInputTemplate } from "@ui/templates/numeric-input"
import { Rating, type RatingProps } from "@ui/atoms/rating"
import { slugify, tv } from "@ui/utils"
import Image from "next/image"
import { type HTMLAttributes, type ReactNode, useId } from "react"
import type { VariantProps } from "tailwind-variants"

//object-cover aspect-product-card-image
const productCard = tv({
  slots: {
    base: [
      "h-full rounded-pc p-pc-padding",
      "content-start grid-rows-pc-card",
      "border-(length:--border-pc-width) max-w-pc-max border-pc-border bg-pc shadow-sm",
    ],
    imageSlot: "aspect-pc-image h-full rounded-pc-image object-cover",
    nameSlot: "truncate text-pc-name-fg text-pc-name-size",
    priceSlot: "text-pc-price-fg text-pc-price-size",
    stockStatusSlot: "text-pc-stock-fg text-pc-stock-size",
    badgesSlot: "flex flex-wrap gap-pc-box min-h-pc-badges-min",
    ratingSlot: "flex items-center",
    buttonsSlot: "flex w-fit flex-wrap self-end",
    cartButton:
      "w-max items-center bg-button-cart text-button-cart-fg hover:bg-button-cart-hover",
    detailButton:
      "w-max bg-button-detail text-button-detail-fg hover:bg-button-detail-hover",
    wishlistButton:
      "w-max bg-button-wishlist text-button-wishlist-fg hover:bg-button-wishlist-hover",
  },
  variants: {
    // variant for layout of the card
    layout: {
      column: {
        base: ["grid grid-cols-1 gap-pc-col-layout"],
        imageSlot: "order-image w-full",
        nameSlot: "order-name",
        priceSlot: "order-price",
        stockStatusSlot: "order-stock",
        badgesSlot: "order-badges",
        ratingSlot: "order-ratings",
        buttonsSlot: "order-buttons",
      },
      row: {
        base: "grid grid-cols-[auto_1fr] gap-x-pc-row-layout",
        imageSlot: "row-span-6",
      },
    },
    // variant for layout of the buttons
    buttonLayout: {
      horizontal: {
        buttonsSlot: "justify-center gap-2",
      },
      vertical: {
        buttonsSlot: "flex-col gap-2",
      },
    },
  },
  /* Define compound styles for slots */
  compoundSlots: [
    {
      layout: "row",
      slots: [
        "nameSlot",
        "priceSlot",
        "stockStatusSlot",
        "badgesSlot",
        "ratingSlot",
        "buttonsSlot",
      ],
      class: ["col-start-2"],
    },
  ],
  defaultVariants: {
    layout: "column",
    buttonLayout: "horizontal",
  },
})

type ProductCardVariants = VariantProps<typeof productCard>

export interface ProductCardProps
  extends ProductCardVariants,
    HTMLAttributes<HTMLDivElement> {
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
  imageLoading?: "lazy" | "eager"
}

export function DemoProductCard({
  imageUrl,
  name,
  price,
  stockStatus,
  badges = [],
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
  imageLoading = "lazy",
  ...props
}: ProductCardProps) {
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
  } = productCard({ layout, buttonLayout })

  return (
    <div className={base({ className, layout })} {...props}>
      {/* Optimized Next.js Image */}
      <div className={`relative ${imageSlot({ layout })}`}>
        <Image
          alt={name}
          className="object-cover"
          fetchPriority={imageLoading === "eager" ? "high" : undefined}
          fill
          loading={imageLoading}
          placeholder="empty"
          quality={20}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 20vw, 15vw"
          src={imageUrl}
        />
      </div>

      {/* Elements with grid positioning based on layout */}
      <h3 className={nameSlot({ layout })}>{name}</h3>

      {rating && (
        <div className={ratingSlot({ layout })}>
          <Rating {...rating} />
        </div>
      )}

      {badges.length > 0 ? (
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
      ) : <div className={badgesSlot({ layout })} aria-hidden="true">
        </div>}

      {stockStatus && (
        <p className={stockStatusSlot({ layout })}>{stockStatus}</p>
      )}

      <p className={priceSlot({ layout })}>{price}</p>

      {(hasCartButton ||
        hasDetailButton ||
        hasWishlistButton ||
        customButtons) && (
        <div className={buttonsSlot({ buttonLayout })}>
          {hasCartButton && (
            <div className="flex gap-pc-box">
              {numericInput && <NumericInputTemplate />}
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
          {hasDetailButton && (
            <Button
              className={detailButton()}
              icon="token-icon-eye"
              onClick={onDetailClick}
              size="sm"
            >
              {detailButtonText}
            </Button>
          )}
          {hasWishlistButton && (
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
