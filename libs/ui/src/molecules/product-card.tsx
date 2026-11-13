/**
 * ProductCard — @techsio/ui-kit molecule.
 *
 * @component ProductCard
 * @componentVersion v2.0.0
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
    root: ["max-w-product-card-max border-product-card-border"],
    imageSlot: "w-full",
    nameSlot:
      "product-card-name line-clamp-product-card-name min-h-product-card-name text-product-card-name-fg",
    priceSlot:
      "mt-auto font-product-card-price text-product-card-price-fg text-product-card-price-size",
    stockStatusSlot: [
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
    presentation: {
      default: {
        root: "border-(length:--border-product-card-width) rounded-product-card bg-product-card-bg p-product-card-padding",
        imageSlot: "rounded-product-card-image",
        nameSlot: "font-product-card-name text-product-card-name-size",
        stockStatusSlot: "font-product-card-stock text-product-card-stock-size",
      },
      featured: {
        root: "border-(length:--border-product-card-featured-width) rounded-product-card-featured bg-product-card-featured-bg p-product-card-featured-padding",
        imageSlot: "rounded-product-card-featured-image",
        nameSlot:
          "font-product-card-featured-name text-product-card-featured-name-size",
        stockStatusSlot:
          "font-product-card-featured-stock text-product-card-featured-stock-size",
      },
    },
    shadow: {
      true: { root: "shadow-sm" },
      false: { root: "shadow-none" },
    },
    objectFit: {
      cover: { imageSlot: "object-cover" },
      contain: { imageSlot: "object-contain" },
      fill: { imageSlot: "object-fill" },
    },
    action: {
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
        root: ["flex h-full flex-col"],
        imageSlot: "aspect-product-card-image",
      },
      row: {
        root: "product-card-row grid w-full grid-cols-(--product-card-layout-row-grid) gap-x-product-card-row-layout",
        imageSlot: "row-span-6 aspect-product-card-image h-full",
      },
    },
  },
  compoundVariants: [
    {
      presentation: "default",
      layout: "column",
      className: { root: "gap-product-card-col-layout" },
    },
    {
      presentation: "featured",
      layout: "column",
      className: { root: "gap-product-card-featured-col-layout" },
    },
  ],
  defaultVariants: {
    presentation: "default",
    shadow: true,
    objectFit: "cover",
    layout: "column",
    action: "cart",
  },
})

// === CONTEXT ===
type ProductCardContextValue = {
  layout?: "column" | "row"
  presentation?: "default" | "featured"
}

const ProductCardContext = createContext<ProductCardContextValue>({})

// === TYPE DEFINITIONS ===
export type ProductCardProps = HTMLAttributes<HTMLDivElement> &
  Omit<VariantProps<typeof productCardVariants>, "action" | "objectFit"> & {
    /** Preserve the default surface shadow, or disable it for flat catalogues. */
    shadow?: boolean
    /** Opt-in featured composition; default retains the original component token roles. */
    presentation?: "default" | "featured"
    children: ReactNode
    ref?: Ref<HTMLDivElement>
  }

type ProductCardImageProps<T extends ElementType = typeof Image> = {
  /** Image fitting inside the card media slot. Defaults to cover. */
  objectFit?: "cover" | "contain" | "fill"
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
  action?: "cart" | "detail" | "wishlist" | "custom"
}

// === ROOT COMPONENT ===
export function ProductCard({
  children,
  layout = "column",
  presentation = "default",
  shadow = true,
  className,
  ref,
  ...props
}: ProductCardProps) {
  const { root } = productCardVariants({ shadow, presentation, layout })

  return (
    <ProductCardContext.Provider value={{ presentation, layout }}>
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
>({
  as,
  objectFit = "cover",
  className,
  ref,
  ...props
}: ProductCardImageProps<T>) {
  const context = useContext(ProductCardContext)
  const { imageSlot } = productCardVariants({
    objectFit,
    presentation: context.presentation,
    layout: context.layout,
  })
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
  const { nameSlot } = productCardVariants({
    presentation: context.presentation,
    layout: context.layout,
  })

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
    presentation: context.presentation,
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
  action,
  ref,
  ...props
}: ProductCardButtonProps) {
  const { button } = productCardVariants({ action })

  return (
    <ButtonComponent
      className={button({ className })}
      icon={icon}
      iconSize={iconSize}
      onClick={onClick}
      ref={ref}
      severity={
        action === "detail" || action === "wishlist" ? "secondary" : "primary"
      }
      size="sm"
      {...props}
    >
      {children}
    </ButtonComponent>
  )
}
