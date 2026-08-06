/*
 * Gallery — @techsio/ui-kit organism.
 *
 * @component Gallery
 * @componentVersion v1.0.0
 * @skill gallery-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the gallery-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, Fragment, useContext, useState } from "react"
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  MouseEvent,
  ReactNode,
} from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { Image } from "../atoms/image"
import { Carousel } from "../molecules/carousel"
import type { CarouselRootProps, CarouselSlide } from "../molecules/carousel"
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
  defaultVariants: {
    orientation: "vertical",
  },
  slots: {
    main: "relative flex min-w-0 h-fit",
    root: "w-full gap-gallery-root",
    thumbnailTrigger: [
      "relative shrink-0",
      "size-(--gallery-thumbnail-size)",
      "aspect-square",
      "overflow-hidden rounded-gallery-trigger border border-gallery-trigger-border bg-gallery-trigger-bg",
      "cursor-pointer p-gallery-trigger",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-gallery-trigger-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-active:border-gallery-trigger-border-active",
      "data-active:bg-gallery-trigger-bg-active",
      "shadow-gallery-trigger",
      "brightness-gallery-trigger",
      "hover:brightness-gallery-trigger-active data-active:brightness-gallery-trigger-active",
      "transition-all duration-200 motion-reduce:transition-none",
      "*:object-cover *:size-full",
    ],
    thumbnails: "shrink-0",
    thumbnailsList: "flex gap-gallery-sm",
    thumbnailsScrollArea: "scrollbar-thin",
  },
  variants: {
    orientation: {
      horizontal: {
        main: "order-1",
        root: "flex flex-col",
        thumbnails: "order-2",
        thumbnailsList: "flex-row items-center py-gallery-sm",
        thumbnailsScrollArea: "w-full overflow-x-auto overflow-y-hidden",
      },
      vertical: {
        main: "order-1 md:col-start-1 md:row-start-1",
        root: "flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
        thumbnails: "order-2 md:col-start-2 md:row-start-1",
        thumbnailsList:
          "flex-row items-center py-gallery-sm md:flex-col md:items-stretch md:px-gallery-xs md:py-0",
        thumbnailsScrollArea:
          "w-full overflow-x-auto overflow-y-hidden md:max-h-gallery md:overflow-x-hidden md:overflow-y-auto",
      },
    },
  },
})

export type GalleryItem = CarouselSlide & {
  thumbnailSrc?: string | undefined
  thumbnailAlt?: string | undefined
  thumbnailContent?: ReactNode | undefined
  thumbnailImageProps?: Record<string, unknown> | undefined
}

export interface GalleryValueChangeDetails {
  value: number
}

export interface GalleryThumbnailAriaLabelParams {
  index: number
  item: GalleryItem
}

export interface GalleryRenderThumbnailParams {
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
    children?: ReactNode | undefined
    value?: number | undefined
    defaultValue?: number | undefined
    onValueChange?: ((details: GalleryValueChangeDetails) => void) | undefined
    showThumbnails?: boolean | undefined
    hideThumbnailsWhenSingle?: boolean | undefined
    thumbnailSize?: number | undefined
    thumbnailImageAs?: GalleryImageComponent<T> | undefined
    getThumbnailAriaLabel?:
      | ((params: GalleryThumbnailAriaLabelParams) => string)
      | undefined
    carouselProps?: GalleryCarouselProps<T> | undefined
    emptyState?: ReactNode | undefined
  }

type GalleryStyles = ReturnType<typeof galleryVariants>
type GalleryPageSetter = (index: number) => void
type GalleryThumbnailAriaLabel = (
  params: GalleryThumbnailAriaLabelParams,
) => string
type GalleryValueChangeHandler = (details: GalleryValueChangeDetails) => void
type GalleryInheritedCarouselProps = GalleryCarouselProps<ElementType>

const galleryContextError = "Gallery components must be used within Gallery"

/*
 * Gallery state is split across one context per value instead of a single object
 * context, so the provider never constructs a value while rendering. The page
 * setter is not stored either: the contexts below carry its raw inputs and
 * `useGallerySetPage` rebuilds the same closure the root used to hand down.
 */
const GalleryItemsContext = createContext<GalleryItem[] | null>(null)
const GalleryPageContext = createContext<number | null>(null)
const GalleryIsControlledContext = createContext<boolean | null>(null)
const GallerySetInternalPageContext = createContext<GalleryPageSetter | null>(
  null,
)
const GalleryValueChangeContext = createContext<
  GalleryValueChangeHandler | undefined
>(undefined)
const GalleryShowThumbnailsContext = createContext<boolean | null>(null)
const GalleryThumbnailSizeContext = createContext<number | null>(null)
const GalleryStylesContext = createContext<GalleryStyles | null>(null)
const GalleryThumbnailAriaLabelContext =
  createContext<GalleryThumbnailAriaLabel | null>(null)
const GalleryThumbnailImageAsContext = createContext<ElementType | undefined>(
  undefined,
)
const GalleryCarouselPropsContext = createContext<
  GalleryInheritedCarouselProps | undefined
>(undefined)

const clampPage = (page: number, maxPage: number) => {
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

const getMaxPage = (items: GalleryItem[]) => Math.max(items.length - 1, 0)

const useGalleryItems = (): GalleryItem[] => {
  const items = useContext(GalleryItemsContext)
  if (items === null) {
    throw new Error(galleryContextError)
  }
  return items
}

const useGalleryPage = (): number => {
  const page = useContext(GalleryPageContext)
  if (page === null) {
    throw new Error(galleryContextError)
  }
  return page
}

const useGalleryShowThumbnails = (): boolean => {
  const showThumbnails = useContext(GalleryShowThumbnailsContext)
  if (showThumbnails === null) {
    throw new Error(galleryContextError)
  }
  return showThumbnails
}

const useGalleryThumbnailSize = (): number => {
  const thumbnailSize = useContext(GalleryThumbnailSizeContext)
  if (thumbnailSize === null) {
    throw new Error(galleryContextError)
  }
  return thumbnailSize
}

const useGalleryStyles = (): GalleryStyles => {
  const styles = useContext(GalleryStylesContext)
  if (styles === null) {
    throw new Error(galleryContextError)
  }
  return styles
}

const useGalleryThumbnailAriaLabel = (): GalleryThumbnailAriaLabel => {
  const getThumbnailAriaLabel = useContext(GalleryThumbnailAriaLabelContext)
  if (getThumbnailAriaLabel === null) {
    throw new Error(galleryContextError)
  }
  return getThumbnailAriaLabel
}

const useGallerySetPage = (): GalleryPageSetter => {
  const items = useGalleryItems()
  const isControlled = useContext(GalleryIsControlledContext)
  const setInternalPage = useContext(GallerySetInternalPageContext)
  const onValueChange = useContext(GalleryValueChangeContext)
  if (isControlled === null || setInternalPage === null) {
    throw new Error(galleryContextError)
  }
  const maxPage = getMaxPage(items)

  return (nextPage: number) => {
    const safePage = clampPage(nextPage, maxPage)

    if (!isControlled) {
      setInternalPage(safePage)
    }

    onValueChange?.({ value: safePage })
  }
}

const getDefaultThumbnailAriaLabel = ({
  index,
}: GalleryThumbnailAriaLabelParams) => `Show slide ${index + 1}`

// Mirrors the previous `item.thumbnailSrc || item.src || ""` chain, where an
// empty string keeps falling through to the next candidate.
const resolveThumbnailSource = (item: GalleryItem): string => {
  if (item.thumbnailSrc !== undefined && item.thumbnailSrc !== "") {
    return item.thumbnailSrc
  }
  if (item.src !== undefined && item.src !== "") {
    return item.src
  }
  return ""
}

interface GalleryThumbnailImageParams {
  as: ElementType
  alt: string
  className?: string | undefined
  imageProps?: Record<string, unknown> | undefined
  size: number
  src: string
}

/*
 * A plain render helper rather than a component: the resolved element type
 * reaches JSX through a parameter, and calling it inline keeps the rendered tree
 * exactly as it was before.
 */
const renderGalleryThumbnailImage = ({
  as: ThumbnailImage,
  alt,
  className,
  imageProps,
  size,
  src,
}: GalleryThumbnailImageParams): ReactNode => (
  <ThumbnailImage
    alt={alt}
    className={className}
    height={size}
    src={src}
    width={size}
    {...imageProps}
  />
)

export const Gallery = <T extends ElementType = typeof Image>({
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
}: GalleryProps<T>) => {
  const maxPage = getMaxPage(items)
  const [internalPage, setInternalPage] = useState(defaultValue)
  const isControlled = value !== undefined
  const page = clampPage(isControlled ? value : internalPage, maxPage)
  const shouldShowThumbnails =
    showThumbnails && !(hideThumbnailsWhenSingle && items.length <= 1)
  const styles = galleryVariants({ orientation })

  // Uncontrolled state is re-clamped while rendering instead of from an effect,
  // so a shrinking item list cannot leave a stale page latched in state.
  if (!isControlled && internalPage !== page) {
    setInternalPage(page)
  }

  return (
    <GalleryItemsContext.Provider value={items}>
      <GalleryPageContext.Provider value={page}>
        <GalleryIsControlledContext.Provider value={isControlled}>
          <GallerySetInternalPageContext.Provider value={setInternalPage}>
            <GalleryValueChangeContext.Provider value={onValueChange}>
              <GalleryShowThumbnailsContext.Provider
                value={shouldShowThumbnails}
              >
                <GalleryThumbnailSizeContext.Provider value={thumbnailSize}>
                  <GalleryStylesContext.Provider value={styles}>
                    <GalleryThumbnailAriaLabelContext.Provider
                      value={getThumbnailAriaLabel}
                    >
                      <GalleryThumbnailImageAsContext.Provider
                        value={thumbnailImageAs}
                      >
                        <GalleryCarouselPropsContext.Provider
                          value={carouselProps}
                        >
                          <div
                            className={styles.root({ className })}
                            {...props}
                          >
                            {items.length === 0 ? emptyState : children}
                          </div>
                        </GalleryCarouselPropsContext.Provider>
                      </GalleryThumbnailImageAsContext.Provider>
                    </GalleryThumbnailAriaLabelContext.Provider>
                  </GalleryStylesContext.Provider>
                </GalleryThumbnailSizeContext.Provider>
              </GalleryShowThumbnailsContext.Provider>
            </GalleryValueChangeContext.Provider>
          </GallerySetInternalPageContext.Provider>
        </GalleryIsControlledContext.Provider>
      </GalleryPageContext.Provider>
    </GalleryItemsContext.Provider>
  )
}

type GalleryMainProps = ComponentPropsWithoutRef<"div">

const GalleryMain = ({ children, className, ...props }: GalleryMainProps) => {
  const styles = useGalleryStyles()

  return (
    <div className={styles.main({ className })} {...props}>
      {children}
    </div>
  )
}

type GalleryThumbnailProps<T extends ElementType = typeof Image> = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  index: number
  children?: ReactNode | undefined
  imageAs?: GalleryImageComponent<T> | undefined
  imageClassName?: string | undefined
}

const GalleryThumbnail = <T extends ElementType = typeof Image>({
  index,
  children,
  imageAs,
  imageClassName,
  className,
  style,
  onClick,
  ...props
}: GalleryThumbnailProps<T>) => {
  const items = useGalleryItems()
  const page = useGalleryPage()
  const setPage = useGallerySetPage()
  const styles = useGalleryStyles()
  const thumbnailSize = useGalleryThumbnailSize()
  const thumbnailImageAs = useContext(GalleryThumbnailImageAsContext)
  const getThumbnailAriaLabel = useGalleryThumbnailAriaLabel()
  const item = items[index]

  if (!item) {
    return null
  }

  const isActive = page === index
  const thumbnailSource = resolveThumbnailSource(item)
  const thumbnailAlt =
    item.thumbnailAlt ?? item.alt ?? `Product image ${index + 1}`
  // The previous custom/default split rendered the same element type on both
  // sides once `imageAs` and `thumbnailImageAs` fall back to `Image`.
  const resolvedImageAs: ElementType = imageAs ?? thumbnailImageAs ?? Image

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

  const thumbnailImage =
    thumbnailSource === ""
      ? null
      : renderGalleryThumbnailImage({
          alt: thumbnailAlt,
          as: resolvedImageAs,
          className: imageClassName,
          imageProps: item.thumbnailImageProps,
          size: thumbnailSize,
          src: thumbnailSource,
        })

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
      {children ?? item.thumbnailContent ?? thumbnailImage}
    </Button>
  )
}

type GalleryThumbnailsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode | undefined
  scrollAreaClassName?: string | undefined
  listClassName?: string | undefined
  thumbnailClassName?: string | undefined
  renderThumbnail?:
    | ((params: GalleryRenderThumbnailParams) => ReactNode)
    | undefined
}

const GalleryThumbnails = ({
  children,
  className,
  listClassName,
  scrollAreaClassName,
  thumbnailClassName,
  renderThumbnail,
  ...props
}: GalleryThumbnailsProps) => {
  const items = useGalleryItems()
  const page = useGalleryPage()
  const setPage = useGallerySetPage()
  const showThumbnails = useGalleryShowThumbnails()
  const styles = useGalleryStyles()

  if (!showThumbnails) {
    return null
  }

  const hasCustomThumbnails = Boolean(children)
  const thumbnails = hasCustomThumbnails
    ? children
    : items.map((item, index) => {
        const defaultThumbnail = (
          <GalleryThumbnail
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
              defaultThumbnail,
              index,
              isActive: page === index,
              item,
              setActive: setPage,
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

type GallerySlideSize = ComponentPropsWithoutRef<typeof Carousel.Slides>["size"]

interface GallerySlidesProps {
  slides?: GalleryItem[] | undefined
  size?: GallerySlideSize
  imageAs?: ElementType | undefined
  className?: string | undefined
}

const GallerySlides = ({
  slides,
  size,
  imageAs,
  className,
}: GallerySlidesProps) => {
  const items = useGalleryItems()
  const carouselProps = useContext(GalleryCarouselPropsContext)

  return (
    <Carousel.Slides
      className={className}
      imageAs={imageAs ?? carouselProps?.imageAs}
      size={size}
      slides={slides ?? items}
    />
  )
}

type GalleryCarouselComponentProps<T extends ElementType = typeof Image> = Omit<
  CarouselRootProps<T>,
  "children" | "slideCount" | "page"
> & {
  children?: ReactNode | undefined
}

const GalleryCarousel = <T extends ElementType = typeof Image>({
  children,
  onPageChange,
  ...props
}: GalleryCarouselComponentProps<T>) => {
  const items = useGalleryItems()
  const page = useGalleryPage()
  const setPage = useGallerySetPage()
  const carouselProps = useContext(GalleryCarouselPropsContext)
  const inheritedProps: GalleryInheritedCarouselProps = carouselProps ?? {}
  /*
   * `imageAs` is the one inherited entry typed against the Gallery root's own
   * element parameter rather than this component's, so only the locally typed
   * prop is forwarded to Carousel — which never reads `imageAs` anyway. The
   * inherited value still reaches Gallery.Slides through its own context.
   */
  const mergedProps = { ...inheritedProps, ...props, imageAs: props.imageAs }
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
      {children ?? <GallerySlides />}
    </Carousel>
  )
}

Gallery.Main = GalleryMain
Gallery.Thumbnails = GalleryThumbnails
Gallery.Thumbnail = GalleryThumbnail
Gallery.Carousel = GalleryCarousel
Gallery.Slides = GallerySlides
Gallery.Root = Gallery
