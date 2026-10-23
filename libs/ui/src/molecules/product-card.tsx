/**
 * ProductCard — @techsio/ui-kit molecule.
 *
 * @component ProductCard
 * @componentVersion v1.3.2
 * @skill product-card-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the product-card-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ComponentProps,
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
import { Button as ButtonComponent } from "../atoms/button"
import { Image, type ImageProps, ImageWithFallback } from "../atoms/image"
import { Rating as RatingComponent, type RatingProps } from "../atoms/rating"
import { tv } from "../utils"

const productCardVariants = tv({
  slots: {
    root: [
      "rounded-product-card p-product-card-padding",
      "border-(length:--border-product-card-width) max-w-product-card-max border-product-card-border bg-product-card-bg shadow-sm",
    ],
    imageSlot: "w-full rounded-product-card-image object-cover",
    nameSlot:
      "product-card-name line-clamp-product-card-name min-h-product-card-name font-product-card-name text-product-card-name-fg text-product-card-name-size",
    priceSlot:
      "mt-auto font-product-card-price text-product-card-price-fg text-product-card-price-size",
    stockStatusSlot: [
      "font-product-card-stock text-product-card-stock-size",
      "data-[stock=in-stock]:text-product-card-stock-fg-in-stock",
      "data-[stock=limited-stock]:text-product-card-stock-fg-limited-stock",
      "data-[stock=out-of-stock]:text-product-card-stock-fg-out-of-stock",
    ],
    badgesSlot: "flex flex-wrap gap-product-card-badges",
    ratingSlot: "flex min-w-0 max-w-full items-center",
    actionsSlot: "flex flex-wrap gap-product-card-actions",
    button: "",
  },
  variants: {
    buttonVariant: {
      cart: {
        button:
          "w-max bg-product-card-button-cart-bg-base text-product-card-button-cart-fg hover:bg-product-card-button-cart-bg-hover active:bg-product-card-button-cart-bg-active active:text-product-card-button-cart-fg",
      },
      detail: {
        button:
          "w-max bg-product-card-button-detail-bg-base text-product-card-button-detail-fg hover:bg-product-card-button-detail-bg-hover active:bg-product-card-button-detail-bg-active active:text-product-card-button-detail-fg",
      },
      wishlist: {
        button:
          "w-max bg-product-card-button-wishlist-bg-base text-product-card-button-wishlist-fg hover:bg-product-card-button-wishlist-bg-hover active:bg-product-card-button-wishlist-bg-active active:text-product-card-button-wishlist-fg",
      },
      custom: {},
    },
    layout: {
      column: {
        root: ["flex h-full flex-col gap-product-card-col-layout"],
        imageSlot: "aspect-product-card-image",
      },
      row: {
        root: "product-card-row grid w-full grid-cols-(--product-card-layout-row-grid) gap-x-product-card-row-layout",
        imageSlot: "row-span-6 aspect-product-card-image h-full",
      },
    },
  },
  defaultVariants: {
    layout: "column",
    buttonVariant: "cart",
  },
})

// === CONTEXT ===
type ProductCardContextValue = {
  layout?: "column" | "row"
}

const ProductCardContext = createContext<ProductCardContextValue>({})

// === TYPE DEFINITIONS ===
export type ProductCardProps = HTMLAttributes<HTMLDivElement> &
  Omit<VariantProps<typeof productCardVariants>, "buttonVariant"> & {
    children: ReactNode
    ref?: Ref<HTMLDivElement>
  }

type ProductCardImageProps<T extends ElementType = typeof Image> = {
  as?: T
  ref?: T extends typeof Image
    ? Ref<HTMLImageElement>
    : ComponentPropsWithRef<NoInfer<T>>["ref"]
  className?: string
} & Omit<
  T extends typeof Image ? ImageProps : ComponentPropsWithoutRef<NoInfer<T>>,
  "as" | "className" | "ref"
>

type ProductCardNameProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode
  /** Heading level that fits the page outline (`h3` by default). */
  as?: "h2" | "h3" | "h4" | "h5" | "h6"
  ref?: Ref<HTMLHeadingElement>
}

type ProductCardPriceProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode
  ref?: Ref<HTMLParagraphElement>
}

type ProductCardStockProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode
  status?: "in-stock" | "limited-stock" | "out-of-stock"
  ref?: Ref<HTMLParagraphElement>
}

type ProductCardBadgesProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

type ProductCardRatingProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
  rating?: RatingProps
}

type ProductCardActionsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}

type ProductCardButtonProps = Omit<
  ComponentProps<typeof ButtonComponent>,
  "size" | "variant"
> & {
  buttonVariant?: "cart" | "detail" | "wishlist" | "custom"
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
      <div
        className={root({ className })}
        ref={ref}
        {...props}
        data-layout={layout}
      >
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
  // Public wrappers retain adapter contracts; media records are resolved at runtime.
  const Media: ElementType = ImageWithFallback
  return (
    <Media
      {...props}
      as={(as && as !== Image ? as : "img") as ElementType}
      className={imageSlot({ className })}
      ref={ref}
    />
  )
}

ProductCard.Name = function ProductCardName({
  as: Heading = "h3",
  children,
  className,
  ref,
  ...props
}: ProductCardNameProps) {
  const context = useContext(ProductCardContext)
  const { nameSlot } = productCardVariants({ layout: context.layout })

  return (
    <Heading className={nameSlot({ className })} ref={ref} {...props}>
      {children}
    </Heading>
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

  const content = rating ? <RatingComponent {...rating} /> : children
  return (
    <div className={ratingSlot({ className })} ref={ref} {...props}>
      {content}
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
    <ButtonComponent
      className={button({ className })}
      icon={icon}
      iconSize={iconSize}
      onClick={onClick}
      ref={ref}
      size="sm"
      variant={
        buttonVariant === "detail" || buttonVariant === "wishlist"
          ? "secondary"
          : "primary"
      }
      {...props}
    >
      {children}
    </ButtonComponent>
  )
}
