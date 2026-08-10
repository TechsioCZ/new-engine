/*
 * Gallery — @techsio/ui-kit organism.
 *
 * @component Gallery
 * @componentVersion v2.0.0
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
  ReactElement,
  ReactNode,
} from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { Image } from "../atoms/image"
import type { ImageProps } from "../atoms/image"
import { rendererCapability } from "../internal/renderer-capability"
import { Carousel, CarouselInheritedSlides } from "../molecules/carousel"
import type {
  CarouselImageComponent,
  CarouselImageRenderer,
  CarouselRootProps,
  CarouselSlide,
  CarouselSlideSource,
} from "../molecules/carousel"
import { tv } from "../utils"

type IsUncheckedValue<Value> = 0 extends 1 & Value ? true : false

type IsDefaultImageComponent<T extends ElementType> =
  IsUncheckedValue<T> extends true
    ? false
    : [T] extends [typeof Image]
      ? [typeof Image] extends [T]
        ? true
        : false
      : false

type SafeComponentProps<T extends ElementType> =
  IsUncheckedValue<T> extends true
    ? never
    : IsUncheckedValue<ComponentPropsWithoutRef<T>> extends true
      ? never
      : ComponentPropsWithoutRef<T>

type SafeProperty<Value, Key extends PropertyKey> = Key extends keyof Value
  ? IsUncheckedValue<Value[Key]> extends true
    ? never
    : Value[Key]
  : never

type AcceptsInjectedProperty<Value, Key extends PropertyKey, Injected> = [
  SafeProperty<Value, Key>,
] extends [never]
  ? false
  : [Injected] extends [SafeProperty<Value, Key>]
    ? true
    : false

type RequiredPropertyKeys<Value> = {
  [Key in keyof Value]-?: Pick<Value, Key> extends Required<Pick<Value, Key>>
    ? Key
    : never
}[keyof Value]

type GalleryImageComponent<T extends ElementType = typeof Image> =
  IsUncheckedValue<T> extends true
    ? never
    : [T] extends [typeof Image]
      ? typeof Image
      : [SafeComponentProps<T>] extends [never]
        ? never
        : "src" extends keyof SafeComponentProps<T>
          ? AcceptsInjectedProperty<
              SafeComponentProps<T>,
              "alt",
              string
            > extends true
            ? AcceptsInjectedProperty<
                SafeComponentProps<T>,
                "width",
                number
              > extends true
              ? AcceptsInjectedProperty<
                  SafeComponentProps<T>,
                  "height",
                  number
                > extends true
                ? T
                : never
              : never
            : never
          : never

type GalleryImageRenderer<T extends ElementType = typeof Image> =
  | GalleryImageComponent<T>
  | (IsDefaultImageComponent<T> extends true ? undefined : never)

const galleryVariants = tv({
  defaultVariants: {
    orientation: "vertical",
  },
  slots: {
    main: "relative flex h-fit min-w-0",
    root: "w-full gap-gallery-root",
    thumbnailTrigger: [
      "relative shrink-0",
      "size-(--gallery-thumbnail-size)",
      "aspect-square",
      "overflow-hidden rounded-gallery-trigger border border-gallery-trigger-border bg-gallery-trigger-bg",
      "cursor-pointer p-gallery-trigger",
      "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-gallery-trigger-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-active:border-gallery-trigger-border-active",
      "data-active:bg-gallery-trigger-bg-active",
      "shadow-gallery-trigger",
      "brightness-gallery-trigger",
      "hover:brightness-gallery-trigger-active data-active:brightness-gallery-trigger-active",
      "transition-all duration-200 motion-reduce:transition-none",
      "*:size-full *:object-cover",
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
        root: "flex flex-col md:grid md:grid-cols-gallery-vertical md:items-start",
        thumbnails: "order-2 md:col-start-2 md:row-start-1",
        thumbnailsList:
          "flex-row items-center py-gallery-sm md:flex-col md:items-stretch md:px-gallery-xs md:py-0",
        thumbnailsScrollArea:
          "w-full overflow-x-auto overflow-y-hidden md:max-h-gallery md:overflow-x-hidden md:overflow-y-auto",
      },
    },
  },
})

type GalleryThumbnailImageProps<T extends ElementType> = Omit<
  [T] extends ["img"]
    ? ImageProps
    : [T] extends [typeof Image]
      ? ImageProps
      : SafeComponentProps<T>,
  "alt" | "fill" | "height" | "src" | "width"
>

type GalleryItemBase<T extends ElementType> = CarouselSlide<T> & {
  src?: CarouselSlideSource<T> | undefined
  thumbnailSrc?: CarouselSlideSource<T> | undefined
  thumbnailAlt?: string | undefined
}

interface GalleryThumbnailContent {
  thumbnailContent: Exclude<ReactNode, null | undefined>
  thumbnailImageProps?: never
}

type GalleryThumbnailImage<T extends ElementType> = {
  thumbnailContent?: null | undefined
} & (RequiredPropertyKeys<GalleryThumbnailImageProps<T>> extends never
  ? { thumbnailImageProps?: GalleryThumbnailImageProps<T> | undefined }
  : { thumbnailImageProps: GalleryThumbnailImageProps<T> })

export type GalleryItem<T extends ElementType = typeof Image> =
  GalleryItemBase<T> & (GalleryThumbnailContent | GalleryThumbnailImage<T>)

export interface GalleryValueChangeDetails {
  value: number
}

export interface GalleryThumbnailAriaLabelParams<
  T extends ElementType = typeof Image,
> {
  index: number
  item: GalleryItem<T>
}

export interface GalleryRenderThumbnailParams<
  T extends ElementType = typeof Image,
> {
  item: GalleryItem<T>
  index: number
  isActive: boolean
  setActive: (index: number) => void
  defaultThumbnail: ReactNode
}

type GalleryCarouselProps<T extends ElementType = typeof Image> = Omit<
  CarouselRootProps<T>,
  "children" | "slideCount" | "page"
>

type GalleryBaseProps<T extends ElementType> = VariantProps<
  typeof galleryVariants
> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    items: GalleryItem<T>[]
    children?: ReactNode | undefined
    value?: number | undefined
    defaultValue?: number | undefined
    onValueChange?: ((details: GalleryValueChangeDetails) => void) | undefined
    showThumbnails?: boolean | undefined
    hideThumbnailsWhenSingle?: boolean | undefined
    thumbnailSize?: number | undefined
    getThumbnailAriaLabel?:
      | ((params: GalleryThumbnailAriaLabelParams<T>) => string)
      | undefined
    emptyState?: ReactNode | undefined
  }

/** @internal */
export type GalleryInheritedRootProps<T extends ElementType> =
  GalleryBaseProps<T> & {
    carouselProps?: GalleryCarouselProps<T> | undefined
    thumbnailImageAs?: GalleryImageComponent<T> | undefined
    rendererCapability: typeof rendererCapability
  }

type GalleryRendererProps<T extends ElementType> =
  | {
      carouselProps: GalleryCarouselProps<T> & {
        imageAs: CarouselImageRenderer<T>
      }
      thumbnailImageAs: GalleryImageRenderer<T>
    }
  | (IsDefaultImageComponent<T> extends true
      ? {
          carouselProps?: GalleryCarouselProps<T> | undefined
          thumbnailImageAs?: GalleryImageComponent<T> | undefined
        }
      : never)

export type GalleryProps<T extends ElementType = typeof Image> =
  GalleryBaseProps<T> & GalleryRendererProps<T>

type GalleryStyles = ReturnType<typeof galleryVariants>
type GalleryPageSetter = (index: number) => void
type GalleryThumbnailAriaLabelRenderer = (index: number) => string
type GalleryValueChangeHandler = (details: GalleryValueChangeDetails) => void
type GalleryInheritedCarouselProps = Omit<GalleryCarouselProps, "imageAs">

interface GalleryItemIdentity {
  id: string
}

const galleryContextError = "Gallery components must be used within Gallery"

/*
 * Gallery state is split across one context per value instead of a single object
 * context, so the provider never constructs a value while rendering. The page
 * setter is not stored either: the contexts below carry its raw inputs and
 * `useGallerySetPage` rebuilds the same closure the root used to hand down.
 */
const GalleryItemsContext = createContext<GalleryItemIdentity[] | null>(null)
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
  createContext<GalleryThumbnailAriaLabelRenderer | null>(null)
const GalleryCarouselPropsContext = createContext<
  GalleryInheritedCarouselProps | undefined
>(undefined)

interface GalleryInheritedThumbnailOptions {
  className?: string | undefined
  index: number
}

type GalleryInheritedThumbnailRenderer = (
  options: GalleryInheritedThumbnailOptions,
) => ReactNode

const GalleryInheritedThumbnailRendererContext =
  createContext<GalleryInheritedThumbnailRenderer | null>(null)

interface GalleryInheritedSlidesOptions {
  className?: string | undefined
  size?: CarouselRootProps["size"] | undefined
}

type GalleryInheritedSlidesRenderer = (
  options: GalleryInheritedSlidesOptions,
) => ReactElement | null

const GalleryInheritedSlidesRendererContext =
  createContext<GalleryInheritedSlidesRenderer | null>(null)

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

const getMaxPage = (items: GalleryItemIdentity[]) =>
  Math.max(items.length - 1, 0)

const useGalleryItems = (): GalleryItemIdentity[] => {
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

const useGalleryThumbnailAriaLabel = (): GalleryThumbnailAriaLabelRenderer => {
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

const getDefaultThumbnailAriaLabel = <T extends ElementType>({
  index,
}: GalleryThumbnailAriaLabelParams<T>) => `Show slide ${index + 1}`

// Mirrors the previous `item.thumbnailSrc || item.src || ""` chain, where an
// empty string keeps falling through to the next candidate.
interface GalleryThumbnailSourceItem<Source> {
  thumbnailSrc?: Source | undefined
  src?: Source | undefined
}

const resolveThumbnailSource = <Source,>(
  item: GalleryThumbnailSourceItem<Source>,
): Source | undefined => {
  if (
    item.thumbnailSrc !== undefined &&
    item.thumbnailSrc !== null &&
    item.thumbnailSrc !== ""
  ) {
    return item.thumbnailSrc
  }
  if (item.src !== undefined && item.src !== null && item.src !== "") {
    return item.src
  }
  return undefined
}

interface GalleryThumbnailImageParams<T extends ElementType> {
  as?: GalleryImageComponent<T> | undefined
  alt: string
  className?: string | undefined
  imageProps?: GalleryThumbnailImageProps<T> | undefined
  size: number
  src: CarouselSlideSource<T>
}

/*
 * A plain render helper rather than a component: the resolved element type
 * reaches JSX through a parameter, and calling it inline keeps the rendered tree
 * exactly as it was before.
 */
const renderGalleryThumbnailImage = <T extends ElementType>({
  as,
  alt,
  className,
  imageProps,
  size,
  src,
}: GalleryThumbnailImageParams<T>): ReactElement => {
  const ThumbnailImage = as ?? Image

  return (
    <ThumbnailImage
      className={className}
      {...imageProps}
      alt={alt}
      height={size}
      src={src}
      width={size}
    />
  )
}

interface GalleryInheritedRenderers<T extends ElementType> {
  carouselProps?: GalleryCarouselProps<T> | undefined
  inheritedCarouselProps?: GalleryInheritedCarouselProps | undefined
  items: GalleryItem<T>[]
  getThumbnailAriaLabel: (params: GalleryThumbnailAriaLabelParams<T>) => string
  renderSlides: GalleryInheritedSlidesRenderer
  renderThumbnail: GalleryInheritedThumbnailRenderer
  renderThumbnailAriaLabel: GalleryThumbnailAriaLabelRenderer
  thumbnailImageAs?: GalleryImageComponent<T> | undefined
  thumbnailSize: number
}

const createGalleryInheritedRenderers = <T extends ElementType>({
  carouselProps,
  getThumbnailAriaLabel,
  items,
  thumbnailImageAs,
  thumbnailSize,
}: {
  carouselProps?: GalleryCarouselProps<T> | undefined
  getThumbnailAriaLabel: (params: GalleryThumbnailAriaLabelParams<T>) => string
  items: GalleryItem<T>[]
  thumbnailImageAs?: GalleryImageComponent<T> | undefined
  thumbnailSize: number
}): GalleryInheritedRenderers<T> => {
  const carouselImageAs = carouselProps?.imageAs
  let inheritedCarouselProps: GalleryInheritedCarouselProps | undefined
  if (carouselProps !== undefined) {
    const { imageAs, ...nonImageCarouselProps } = carouselProps
    inheritedCarouselProps = nonImageCarouselProps
    void imageAs
  }

  return {
    carouselProps,
    getThumbnailAriaLabel,
    inheritedCarouselProps,
    items,
    renderSlides: ({ className, size }) => (
      <CarouselInheritedSlides<T>
        className={className}
        rendererCapability={rendererCapability}
        imageAs={carouselImageAs}
        size={size}
        slides={items}
      />
    ),
    renderThumbnail: ({ className, index }): ReactNode => {
      const item = items[index]
      if (!item) {
        return null
      }
      const src = resolveThumbnailSource(item)
      const thumbnailImage =
        src === undefined
          ? null
          : renderGalleryThumbnailImage<T>({
              alt:
                item.thumbnailAlt ?? item.alt ?? `Product image ${index + 1}`,
              as: thumbnailImageAs,
              className,
              imageProps: item.thumbnailImageProps,
              size: thumbnailSize,
              src,
            })

      return item.thumbnailContent ?? thumbnailImage
    },
    renderThumbnailAriaLabel: (index) => {
      const item = items[index]
      if (!item) {
        return ""
      }
      return getThumbnailAriaLabel({ index, item })
    },
    thumbnailImageAs,
    thumbnailSize,
  }
}

/** @internal */
export const GalleryInheritedRoot = <T extends ElementType = typeof Image>({
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
  rendererCapability: providedRendererCapability,
  ...props
}: GalleryInheritedRootProps<T>) => {
  if (providedRendererCapability !== rendererCapability) {
    throw new Error("Gallery inherited renderer capability is invalid")
  }
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

  const [inheritedRenderers, setInheritedRenderers] = useState(() =>
    createGalleryInheritedRenderers<T>({
      carouselProps,
      getThumbnailAriaLabel,
      items,
      thumbnailImageAs,
      thumbnailSize,
    }),
  )
  const inheritedDataChanged =
    inheritedRenderers.items !== items ||
    inheritedRenderers.carouselProps !== carouselProps ||
    inheritedRenderers.getThumbnailAriaLabel !== getThumbnailAriaLabel
  const inheritedPresentationChanged =
    inheritedRenderers.thumbnailImageAs !== thumbnailImageAs ||
    inheritedRenderers.thumbnailSize !== thumbnailSize
  if (inheritedDataChanged || inheritedPresentationChanged) {
    setInheritedRenderers(
      createGalleryInheritedRenderers<T>({
        carouselProps,
        getThumbnailAriaLabel,
        items,
        thumbnailImageAs,
        thumbnailSize,
      }),
    )
  }

  return (
    <GalleryInheritedSlidesRendererContext.Provider
      value={inheritedRenderers.renderSlides}
    >
      <GalleryItemsContext.Provider value={inheritedRenderers.items}>
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
                        value={inheritedRenderers.renderThumbnailAriaLabel}
                      >
                        <GalleryInheritedThumbnailRendererContext.Provider
                          value={inheritedRenderers.renderThumbnail}
                        >
                          <GalleryCarouselPropsContext.Provider
                            value={inheritedRenderers.inheritedCarouselProps}
                          >
                            <div
                              className={styles.root({ className })}
                              {...props}
                            >
                              {items.length === 0 ? emptyState : children}
                            </div>
                          </GalleryCarouselPropsContext.Provider>
                        </GalleryInheritedThumbnailRendererContext.Provider>
                      </GalleryThumbnailAriaLabelContext.Provider>
                    </GalleryStylesContext.Provider>
                  </GalleryThumbnailSizeContext.Provider>
                </GalleryShowThumbnailsContext.Provider>
              </GalleryValueChangeContext.Provider>
            </GallerySetInternalPageContext.Provider>
          </GalleryIsControlledContext.Provider>
        </GalleryPageContext.Provider>
      </GalleryItemsContext.Provider>
    </GalleryInheritedSlidesRendererContext.Provider>
  )
}

export const Gallery = <T extends ElementType = typeof Image>(
  props: GalleryProps<T>,
) => (
  <GalleryInheritedRoot<T> {...props} rendererCapability={rendererCapability} />
)

type GalleryMainProps = ComponentPropsWithoutRef<"div">

const GalleryMain = ({ children, className, ...props }: GalleryMainProps) => {
  const styles = useGalleryStyles()

  return (
    <div className={styles.main({ className })} {...props}>
      {children}
    </div>
  )
}

type GalleryThumbnailBaseProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  index: number
  children?: ReactNode | undefined
  imageClassName?: string | undefined
}

type GalleryThumbnailProps<T extends ElementType = typeof Image> =
  GalleryThumbnailBaseProps &
    (
      | { imageAs?: undefined; item?: undefined }
      | { imageAs: GalleryImageComponent<T>; item: GalleryItem<T> }
    )

const GalleryThumbnail = <T extends ElementType = typeof Image>({
  index,
  children,
  imageAs,
  item: overrideItem,
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
  const renderInheritedThumbnail = useContext(
    GalleryInheritedThumbnailRendererContext,
  )
  const renderThumbnailAriaLabel = useGalleryThumbnailAriaLabel()
  const itemIdentity = items[index]

  if (!itemIdentity) {
    return null
  }

  const isActive = page === index
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) {
      return
    }
    setPage(index)
  }

  const resolvedStyle: CSSProperties & {
    "--gallery-thumbnail-size": string
  } = {
    "--gallery-thumbnail-size": `${thumbnailSize}px`,
    ...style,
  }

  if (renderInheritedThumbnail === null) {
    throw new Error(galleryContextError)
  }

  let defaultThumbnail: ReactNode
  if (imageAs === undefined) {
    defaultThumbnail = renderInheritedThumbnail({
      className: imageClassName,
      index,
    })
  } else {
    if (overrideItem === undefined) {
      throw new Error("Gallery.Thumbnail imageAs requires a matching item")
    }
    const thumbnailSource = resolveThumbnailSource(overrideItem)
    const thumbnailImage =
      thumbnailSource === undefined
        ? null
        : renderGalleryThumbnailImage<T>({
            alt:
              overrideItem.thumbnailAlt ??
              overrideItem.alt ??
              `Product image ${index + 1}`,
            as: imageAs,
            className: imageClassName,
            imageProps: overrideItem.thumbnailImageProps,
            size: thumbnailSize,
            src: thumbnailSource,
          })
    defaultThumbnail = overrideItem.thumbnailContent ?? thumbnailImage
  }

  return (
    <Button
      aria-current={isActive ? "true" : undefined}
      aria-label={renderThumbnailAriaLabel(index)}
      className={styles.thumbnailTrigger({ className })}
      data-active={isActive || undefined}
      onClick={handleClick}
      size="current"
      style={resolvedStyle}
      theme="unstyled"
      type="button"
      {...props}
    >
      {children ?? defaultThumbnail}
    </Button>
  )
}

type GalleryThumbnailsBaseProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode | undefined
  scrollAreaClassName?: string | undefined
  listClassName?: string | undefined
  thumbnailClassName?: string | undefined
}

type GalleryRenderThumbnailIdentityParams = Omit<
  GalleryRenderThumbnailParams,
  "item"
> & {
  item: GalleryItemIdentity
}

type GalleryThumbnailsProps<T extends ElementType = typeof Image> =
  GalleryThumbnailsBaseProps &
    (
      | {
          items?: undefined
          renderThumbnail?:
            | ((params: GalleryRenderThumbnailIdentityParams) => ReactNode)
            | undefined
        }
      | {
          items: GalleryItem<T>[]
          renderThumbnail: (
            params: GalleryRenderThumbnailParams<T>,
          ) => ReactNode
        }
    )

const GalleryThumbnails = <T extends ElementType = typeof Image>({
  children,
  className,
  items: renderItems,
  listClassName,
  scrollAreaClassName,
  thumbnailClassName,
  renderThumbnail,
  ...props
}: GalleryThumbnailsProps<T>) => {
  const items = useGalleryItems()
  const page = useGalleryPage()
  const setPage = useGallerySetPage()
  const showThumbnails = useGalleryShowThumbnails()
  const styles = useGalleryStyles()

  if (!showThumbnails) {
    return null
  }

  const hasCustomThumbnails = Boolean(children)
  let thumbnails: ReactNode
  if (hasCustomThumbnails) {
    thumbnails = children
  } else if (renderItems === undefined) {
    thumbnails = items.map((item, index) => {
      const defaultThumbnail = (
        <GalleryThumbnail
          className={thumbnailClassName}
          index={index}
          key={item.id}
        />
      )

      if (renderThumbnail === undefined) {
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
  } else {
    thumbnails = renderItems.map((item, index) => {
      const defaultThumbnail = (
        <GalleryThumbnail
          className={thumbnailClassName}
          index={index}
          key={item.id}
        />
      )

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
  }

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

type GallerySlideSize = CarouselRootProps["size"]

interface GallerySlidesSharedProps {
  size?: GallerySlideSize
  className?: string | undefined
}

type GallerySlidesProps<T extends ElementType = typeof Image> =
  | (GallerySlidesSharedProps & { slides?: undefined })
  | (GallerySlidesSharedProps & {
      imageAs: CarouselImageComponent<T>
      slides: GalleryItem<T>[]
    })

const GallerySlides = <T extends ElementType = typeof Image>(
  props: GallerySlidesProps<T>,
): ReactElement | null => {
  const renderInheritedSlides = useContext(
    GalleryInheritedSlidesRendererContext,
  )
  if (renderInheritedSlides === null) {
    throw new Error(galleryContextError)
  }

  if ("imageAs" in props) {
    return (
      <Carousel.Slides<T>
        className={props.className}
        imageAs={props.imageAs}
        size={props.size}
        slides={props.slides}
      />
    )
  }

  return renderInheritedSlides({
    className: props.className,
    size: props.size,
  })
}

type GalleryCarouselComponentProps = Omit<
  CarouselRootProps,
  "children" | "imageAs" | "page" | "slideCount"
> & {
  children?: ReactNode | undefined
}

const GalleryCarousel = ({
  children,
  onPageChange,
  ...props
}: GalleryCarouselComponentProps) => {
  const items = useGalleryItems()
  const page = useGalleryPage()
  const setPage = useGallerySetPage()
  const carouselProps = useContext(GalleryCarouselPropsContext)
  const inheritedProps: GalleryInheritedCarouselProps = carouselProps ?? {}
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
