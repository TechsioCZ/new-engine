import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  createContext,
  type ElementType,
  Fragment,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Image } from "../atoms/image"
import {
  Carousel,
  type CarouselRootProps,
  type CarouselSlide,
} from "../molecules/carousel"
import { tv } from "../utils"

type GalleryImageComponent<T extends ElementType = typeof Image> =
  T extends typeof Image
    ? typeof Image
    : T extends ElementType
      ? "src" extends keyof ComponentPropsWithoutRef<T>
        ? "alt" extends keyof ComponentPropsWithoutRef<T>
          ? T
          : never
        : never
      : never

const galleryVariants = tv({
  slots: {
    root: "w-full gap-gallery-root",
    main: "relative flex min-w-0 h-fit",
    thumbnails: "shrink-0",
    thumbnailsScrollArea: "scrollbar-thin",
    thumbnailsList: "flex gap-gallery-sm",
    thumbnailTrigger: [
      "relative shrink-0",
      "size-(--gallery-thumbnail-size)",
      "aspect-square",
      "overflow-hidden rounded-gallery-trigger border border-gallery-trigger-border bg-gallery-trigger-bg",
      "cursor-pointer p-gallery-trigger",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-gallery-trigger-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[active=true]:border-gallery-trigger-border-active",
      "data-[active=true]:bg-gallery-trigger-bg-active",
      "shadow-gallery-trigger",
      "brightness-gallery-trigger",
      "hover:brightness-gallery-trigger-active data-[active=true]:brightness-gallery-trigger-active",
      "transition-all duration-200 motion-reduce:transition-none",
      "*:h-full *:w-full *:rounded-[calc(var(--radius-gallery-trigger)-1px)] *:object-cover",
    ],
  },
  variants: {
    orientation: {
      horizontal: {
        root: "flex flex-col",
        main: "order-1",
        thumbnails: "order-2",
        thumbnailsScrollArea: "w-full overflow-x-auto overflow-y-hidden",
        thumbnailsList: "flex-row items-center py-gallery-sm",
      },
      vertical: {
        root: "flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
        main: "order-1 md:col-start-1 md:row-start-1",
        thumbnails: "order-2 md:col-start-2 md:row-start-1",
        thumbnailsScrollArea:
          "w-full overflow-x-auto overflow-y-hidden md:max-h-gallery md:overflow-x-hidden md:overflow-y-auto",
        thumbnailsList:
          "flex-row items-center py-gallery-sm md:flex-col md:items-stretch md:px-gallery-xs md:py-0",
      },
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

export type GalleryItem = CarouselSlide & {
  thumbnailSrc?: string
  thumbnailAlt?: string
  thumbnailContent?: ReactNode
  thumbnailImageProps?: Record<string, unknown>
}

export type GalleryValueChangeDetails = {
  value: number
}

export type GalleryThumbnailAriaLabelParams = {
  index: number
  item: GalleryItem
}

export type GalleryRenderThumbnailParams = {
  item: GalleryItem
  index: number
  isActive: boolean
  setActive: (index: number) => void
  defaultThumbnail: ReactNode
}

type GalleryCarouselProps<T extends ElementType = typeof Image> = Omit<
  CarouselRootProps<T>,
  "children" | "slideCount" | "page"
>

export type GalleryProps<T extends ElementType = typeof Image> = VariantProps<
  typeof galleryVariants
> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    items: GalleryItem[]
    children?: ReactNode
    value?: number
    defaultValue?: number
    onValueChange?: (details: GalleryValueChangeDetails) => void
    showThumbnails?: boolean
    hideThumbnailsWhenSingle?: boolean
    thumbnailSize?: number
    thumbnailImageAs?: GalleryImageComponent<T>
    getThumbnailAriaLabel?: (params: GalleryThumbnailAriaLabelParams) => string
    carouselProps?: GalleryCarouselProps<T>
    emptyState?: ReactNode
  }

type GalleryContextValue = {
  items: GalleryItem[]
  page: number
  setPage: (index: number) => void
  showThumbnails: boolean
  thumbnailSize: number
  thumbnailImageAs?: ElementType
  getThumbnailAriaLabel: (params: GalleryThumbnailAriaLabelParams) => string
  styles: ReturnType<typeof galleryVariants>
  carouselProps?: GalleryCarouselProps<ElementType>
}

const GalleryContext = createContext<GalleryContextValue | null>(null)

function useGalleryContext() {
  const context = useContext(GalleryContext)
  if (!context) {
    throw new Error("Gallery components must be used within Gallery")
  }
  return context
}

function clampPage(page: number, maxPage: number) {
  if (Number.isNaN(page)) {
    return 0
  }
  if (page < 0) {
    return 0
  }
  if (page > maxPage) {
    return maxPage
  }
  return page
}

function getDefaultThumbnailAriaLabel({
  index,
}: GalleryThumbnailAriaLabelParams) {
  return `Show slide ${index + 1}`
}

export function Gallery<T extends ElementType = typeof Image>({
  items,
  children,
  orientation,
  value,
  defaultValue = 0,
  onValueChange,
  showThumbnails = true,
  hideThumbnailsWhenSingle = true,
  thumbnailSize = 60,
  thumbnailImageAs,
  getThumbnailAriaLabel = getDefaultThumbnailAriaLabel,
  carouselProps,
  emptyState,
  className,
  ...props
}: GalleryProps<T>) {
  const maxPage = Math.max(items.length - 1, 0)
  const [internalPage, setInternalPage] = useState(defaultValue)
  const isControlled = value !== undefined
  const page = clampPage(isControlled ? value : internalPage, maxPage)
  const shouldShowThumbnails =
    showThumbnails && !(hideThumbnailsWhenSingle && items.length <= 1)
  const styles = galleryVariants({ orientation })

  useEffect(() => {
    if (!isControlled) {
      setInternalPage((currentPage) => clampPage(currentPage, maxPage))
    }
  }, [isControlled, maxPage])

  const setPage = (nextPage: number) => {
    const safePage = clampPage(nextPage, maxPage)

    if (!isControlled) {
      setInternalPage(safePage)
    }

    onValueChange?.({ value: safePage })
  }

  return (
    <GalleryContext.Provider
      value={{
        items,
        page,
        setPage,
        showThumbnails: shouldShowThumbnails,
        thumbnailSize,
        thumbnailImageAs,
        getThumbnailAriaLabel,
        styles,
        carouselProps: carouselProps as GalleryCarouselProps<ElementType>,
      }}
    >
      <div className={styles.root({ className })} {...props}>
        {items.length === 0 ? emptyState : children}
      </div>
    </GalleryContext.Provider>
  )
}

type GalleryMainProps = ComponentPropsWithoutRef<"div">

Gallery.Main = function GalleryMain({
  children,
  className,
  ...props
}: GalleryMainProps) {
  const { styles } = useGalleryContext()

  return (
    <div className={styles.main({ className })} {...props}>
      {children}
    </div>
  )
}

type GalleryThumbnailsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode
  scrollAreaClassName?: string
  listClassName?: string
  thumbnailClassName?: string
  renderThumbnail?: (params: GalleryRenderThumbnailParams) => ReactNode
}

Gallery.Thumbnails = function GalleryThumbnails({
  children,
  className,
  listClassName,
  scrollAreaClassName,
  thumbnailClassName,
  renderThumbnail,
  ...props
}: GalleryThumbnailsProps) {
  const { items, page, setPage, showThumbnails, styles } = useGalleryContext()

  if (!showThumbnails) {
    return null
  }

  const thumbnails = children
    ? children
    : items.map((item, index) => {
        const defaultThumbnail = (
          <Gallery.Thumbnail
            className={thumbnailClassName}
            index={index}
            key={item.id}
          />
        )

        if (!renderThumbnail) {
          return defaultThumbnail
        }

        return (
          <Fragment key={item.id}>
            {renderThumbnail({
              item,
              index,
              isActive: page === index,
              setActive: setPage,
              defaultThumbnail,
            })}
          </Fragment>
        )
      })

  return (
    <div className={styles.thumbnails({ className })} {...props}>
      <div
        className={styles.thumbnailsScrollArea({
          className: scrollAreaClassName,
        })}
      >
        <div className={styles.thumbnailsList({ className: listClassName })}>
          {thumbnails}
        </div>
      </div>
    </div>
  )
}

type GalleryThumbnailProps<T extends ElementType = typeof Image> = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  index: number
  children?: ReactNode
  imageAs?: GalleryImageComponent<T>
  imageClassName?: string
}

Gallery.Thumbnail = function GalleryThumbnail<
  T extends ElementType = typeof Image,
>({
  index,
  children,
  imageAs,
  imageClassName,
  className,
  style,
  onClick,
  ...props
}: GalleryThumbnailProps<T>) {
  const {
    items,
    page,
    setPage,
    styles,
    thumbnailSize,
    thumbnailImageAs,
    getThumbnailAriaLabel,
  } = useGalleryContext()
  const item = items[index]

  if (!item) {
    return null
  }

  const isActive = page === index
  const thumbnailSource = item.thumbnailSrc || item.src || ""
  const thumbnailAlt =
    item.thumbnailAlt || item.alt || `Product image ${index + 1}`
  const resolvedImageAs = (imageAs ||
    thumbnailImageAs ||
    Image) as GalleryImageComponent<T>
  const hasCustomThumbnailComponent = resolvedImageAs && resolvedImageAs !== Image
  const CustomThumbnailComponent = hasCustomThumbnailComponent
    ? (resolvedImageAs as ElementType)
    : Image

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) {
      return
    }
    setPage(index)
  }

  const resolvedStyle = {
    "--gallery-thumbnail-size": `${thumbnailSize}px`,
    ...style,
  } as CSSProperties

  return (
    <Button
      aria-current={isActive ? "true" : undefined}
      aria-label={getThumbnailAriaLabel({ index, item })}
      className={styles.thumbnailTrigger({ className })}
      data-active={isActive || undefined}
      onClick={handleClick}
      size="current"
      style={resolvedStyle}
      theme="unstyled"
      type="button"
      {...props}
    >
      {children ||
        item.thumbnailContent ||
        (thumbnailSource ? (
          hasCustomThumbnailComponent ? (
            <CustomThumbnailComponent
              alt={thumbnailAlt}
              className={imageClassName}
              height={thumbnailSize}
              src={thumbnailSource}
              width={thumbnailSize}
              {...item.thumbnailImageProps}
            />
          ) : (
            <Image
              alt={thumbnailAlt}
              className={imageClassName}
              height={thumbnailSize}
              src={thumbnailSource}
              width={thumbnailSize}
              {...item.thumbnailImageProps}
            />
          )
        ) : null)}
    </Button>
  )
}

type GalleryCarouselComponentProps<T extends ElementType = typeof Image> = Omit<
  CarouselRootProps<T>,
  "children" | "slideCount" | "page"
> & {
  children?: ReactNode
}

Gallery.Carousel = function GalleryCarousel<
  T extends ElementType = typeof Image,
>({ children, onPageChange, ...props }: GalleryCarouselComponentProps<T>) {
  const { items, page, setPage, carouselProps } = useGalleryContext()
  const inheritedProps = (carouselProps || {}) as GalleryCarouselProps<T>
  const mergedProps = { ...inheritedProps, ...props }
  const inheritedOnPageChange = inheritedProps.onPageChange

  const handlePageChange = (details: {
    page: number
    pageSnapPoint: number
  }) => {
    setPage(details.page)
    // Avoid double-calling when the same callback is passed via carouselProps and direct prop.
    if (inheritedOnPageChange === onPageChange) {
      inheritedOnPageChange?.(details)
      return
    }
    inheritedOnPageChange?.(details)
    onPageChange?.(details)
  }

  return (
    <Carousel
      {...mergedProps}
      onPageChange={handlePageChange}
      page={page}
      slideCount={items.length}
    >
      {children || <Gallery.Slides />}
    </Carousel>
  )
}

type GallerySlidesProps = {
  slides?: GalleryItem[]
  size?: "sm" | "md" | "lg" | "full"
  imageAs?: ElementType
  className?: string
}

Gallery.Slides = function GallerySlides({
  slides,
  size,
  imageAs,
  className,
}: GallerySlidesProps) {
  const { items, carouselProps } = useGalleryContext()
  const inheritedProps = carouselProps || {}

  return (
    <Carousel.Slides
      className={className}
      imageAs={imageAs ?? inheritedProps.imageAs}
      size={size}
      slides={(slides || items) as CarouselSlide[]}
    />
  )
}

Gallery.Root = Gallery
