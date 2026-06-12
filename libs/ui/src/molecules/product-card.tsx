import {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  createContext,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useContext,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import type { IconProps, IconType } from "../atoms/icon"
import { Image } from "../atoms/image"
import { Rating, type RatingProps } from "../atoms/rating"
import { tv } from "../utils"

const productCardVariants = tv({
  slots: {
    root: [
      "rounded-product-card p-product-card-padding",
      "border-(length:--border-product-card-width) max-w-product-card-max border-product-card-border bg-product-card-bg shadow-sm",
    ],
    imageSlot: "h-full rounded-product-card-image object-cover",
    nameSlot:
      "line-clamp-product-card-name font-product-card-name text-product-card-name-fg text-product-card-name-size",
    priceSlot:
      "font-product-card-price text-product-card-price-fg text-product-card-price-size",
    stockStatusSlot: [
      "font-product-card-stock text-product-card-stock-size",
      "data-[stock=in-stock]:text-product-card-stock-fg-in-stock",
      "data-[stock=limited-stock]:text-product-card-stock-fg-limited-stock",
      "data-[stock=out-of-stock]:text-product-card-stock-fg-out-of-stock",
    ],
    badgesSlot: "flex flex-wrap gap-product-card-badges",
    ratingSlot: "flex items-center",
    actionsSlot: "flex flex-wrap gap-product-card-actions",
    button: "",
  },
  variants: {
    buttonVariant: {
      cart: {
        button:
          "w-max bg-product-card-button-cart-bg-base text-product-card-button-cart-fg hover:bg-product-card-button-cart-bg-hover",
      },
      detail: {
        button:
          "w-max bg-product-card-button-detail-bg-base text-product-card-button-detail-fg hover:bg-product-card-button-detail-bg-hover",
      },
      wishlist: {
        button:
          "w-max bg-product-card-button-wishlist-bg-base text-product-card-button-wishlist-fg hover:bg-product-card-button-wishlist-bg-hover",
      },
      custom: {},
    },
    layout: {
      column: {
        root: [
          "grid grid-cols-(--product-card-layout-column-grid) gap-product-card-col-layout",
        ],
        imageSlot: "aspect-product-card-image",
      },
      row: {
        root: "grid grid-cols-(--product-card-layout-row-grid) gap-x-product-card-row-layout",
        imageSlot: "row-span-6 aspect-auto",
      },
    },
  },
  defaultVariants: {
    layout: "column",
    buttonVariant: "cart",
  },
})

// === CONTEXT ===
interface ProductCardContextValue {
  layout?: "column" | "row"
}

const ProductCardContext = createContext<ProductCardContextValue>({})

// === TYPE DEFINITIONS ===
export interface ProductCardProps
  extends HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof productCardVariants>, "buttonVariant"> {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

type ProductCardImageProps<T extends ElementType = typeof Image> = {
  as?: T
  ref?: ComponentPropsWithRef<T>["ref"]
  className?: string
} & Partial<ComponentPropsWithoutRef<T>>

interface ProductCardNameProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  ref?: Ref<HTMLHeadingElement>
}

interface ProductCardPriceProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
  ref?: Ref<HTMLParagraphElement>
}

interface ProductCardStockProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
  status?: "in-stock" | "limited-stock" | "out-of-stock"
  ref?: Ref<HTMLParagraphElement>
}

interface ProductCardBadgesProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

interface ProductCardRatingProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
  rating?: RatingProps
}

interface ProductCardActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

interface ProductCardButtonProps extends HTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  onClick?: () => void
  buttonVariant?: "cart" | "detail" | "wishlist" | "custom"
  icon?: IconType
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLButtonElement>
}

// === ROOT COMPONENT ===
export function ProductCard({
  children,
  layout = "column",
  className,
  ref,
  ...props
}: ProductCardProps) {
  const { root } = productCardVariants({ layout })

  return (
    <ProductCardContext.Provider value={{ layout }}>
      <div className={root({ className })} ref={ref} {...props}>
        {children}
      </div>
    </ProductCardContext.Provider>
  )
}

// === SUB-COMPONENTS ===
ProductCard.Image = function ProductCardImage<
  T extends ElementType = typeof Image,
>({ as, className, ref, ...props }: ProductCardImageProps<T>) {
  const context = useContext(ProductCardContext)
  const { imageSlot } = productCardVariants({ layout: context.layout })
  const ImageComponent = (as || Image) as ElementType

  return (
    <ImageComponent className={imageSlot({ className })} ref={ref} {...props} />
  )
}

ProductCard.Name = function ProductCardName({
  children,
  className,
  ref,
  ...props
}: ProductCardNameProps) {
  const context = useContext(ProductCardContext)
  const { nameSlot } = productCardVariants({ layout: context.layout })

  return (
    <h3 className={nameSlot({ className })} ref={ref} {...props}>
      {children}
    </h3>
  )
}

ProductCard.Price = function ProductCardPrice({
  children,
  className,
  ref,
  ...props
}: ProductCardPriceProps) {
  const context = useContext(ProductCardContext)
  const { priceSlot } = productCardVariants({ layout: context.layout })

  return (
    <p className={priceSlot({ className })} ref={ref} {...props}>
      {children}
    </p>
  )
}

ProductCard.Stock = function ProductCardStock({
  children,
  className,
  ref,
  status = "in-stock",
  ...props
}: ProductCardStockProps) {
  const context = useContext(ProductCardContext)
  const { stockStatusSlot } = productCardVariants({
    layout: context.layout,
  })

  return (
    <p
      className={stockStatusSlot({ className })}
      data-stock={status}
      ref={ref}
      {...props}
    >
      {children}
    </p>
  )
}

ProductCard.Badges = function ProductCardBadges({
  children,
  className,
  ref,
  ...props
}: ProductCardBadgesProps) {
  const context = useContext(ProductCardContext)
  const { badgesSlot } = productCardVariants({ layout: context.layout })

  return (
    <div className={badgesSlot({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

ProductCard.Rating = function ProductCardRating({
  children,
  className,
  rating,
  ref,
  ...props
}: ProductCardRatingProps) {
  const context = useContext(ProductCardContext)
  const { ratingSlot } = productCardVariants({ layout: context.layout })

  return (
    <div className={ratingSlot({ className })} ref={ref} {...props}>
      {rating ? <Rating {...rating} /> : children}
    </div>
  )
}

ProductCard.Actions = function ProductCardActions({
  children,
  className,
  ref,
  ...props
}: ProductCardActionsProps) {
  const context = useContext(ProductCardContext)
  const { actionsSlot } = productCardVariants({
    layout: context.layout,
  })

  return (
    <div className={actionsSlot({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

ProductCard.Button = function ProductCardButton({
  children,
  onClick,
  icon,
  iconSize,
  className,
  buttonVariant,
  ref,
  ...props
}: ProductCardButtonProps) {
  const { button } = productCardVariants({ buttonVariant })

  return (
    <Button
      className={button({ className })}
      icon={icon}
      iconSize={iconSize}
      onClick={onClick}
      ref={ref}
      size="sm"
      {...props}
    >
      {children}
    </Button>
  )
}
