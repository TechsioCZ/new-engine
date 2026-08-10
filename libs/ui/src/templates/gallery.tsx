/*
 * Gallery — @techsio/ui-kit template.
 *
 * @component Gallery
 * @componentVersion v2.0.0
 * @skill gallery-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the gallery-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

import type { IconType } from "../atoms/icon"
import type { Image } from "../atoms/image"
import { rendererCapability } from "../internal/renderer-capability"
import { Carousel } from "../molecules/carousel"
import type { CarouselRootProps } from "../molecules/carousel"
import { Gallery, GalleryInheritedRoot } from "../organisms/gallery"
import type {
  GalleryInheritedRootProps,
  GalleryItem,
  GalleryProps,
  GalleryRenderThumbnailParams,
} from "../organisms/gallery"

const resolveSlides = <T extends ElementType>(
  items: GalleryItem<T>[],
  renderSlide?: (params: { item: GalleryItem<T>; index: number }) => ReactNode,
) => {
  if (renderSlide === undefined) {
    return items
  }

  return items.map((item, index): GalleryItem<T> => {
    const content = renderSlide({ index, item })
    if (content === undefined) {
      return item
    }
    return { ...item, content }
  })
}

type IsUncheckedValue<Value> = 0 extends 1 & Value ? true : false

type IsDefaultImageComponent<T extends ElementType> =
  IsUncheckedValue<T> extends true
    ? false
    : [T] extends [typeof Image]
      ? [typeof Image] extends [T]
        ? true
        : false
      : false

type GalleryTemplateImageComponent<T extends ElementType> = NonNullable<
  GalleryProps<T>["thumbnailImageAs"]
>

type GalleryTemplateBaseProps<T extends ElementType> = Omit<
  GalleryInheritedRootProps<T>,
  | "carouselProps"
  | "children"
  | "items"
  | "rendererCapability"
  | "thumbnailImageAs"
> & {
  items: GalleryItem<T>[]
  carouselWidth?: CarouselRootProps<T>["width"] | undefined
  carouselHeight?: CarouselRootProps<T>["height"] | undefined
  fitParent?: boolean | undefined
  carouselClassName?: string | undefined
  slidesClassName?: string | undefined
  mainClassName?: string | undefined
  thumbnailsClassName?: string | undefined
  thumbnailsScrollAreaClassName?: string | undefined
  thumbnailsListClassName?: string | undefined
  thumbnailClassName?: string | undefined
  renderThumbnail?:
    | ((params: GalleryRenderThumbnailParams<T>) => ReactNode)
    | undefined
  renderSlide?:
    | ((params: { item: GalleryItem<T>; index: number }) => ReactNode)
    | undefined
  showControls?: boolean | undefined
  showIndicators?: boolean | undefined
  showAutoplay?: boolean | undefined
  controlsClassName?: string | undefined
  indicatorsClassName?: string | undefined
  controlPosition?:
    | ComponentPropsWithoutRef<typeof Carousel.Control>["controlPosition"]
    | undefined
  prevIcon?: IconType | undefined
  nextIcon?: IconType | undefined
  previousTriggerClassName?: string | undefined
  nextTriggerClassName?: string | undefined
  autoplayTriggerClassName?: string | undefined
  aspectRatio?: CarouselRootProps<T>["aspectRatio"] | undefined
  size?: CarouselRootProps<T>["size"] | undefined
  objectFit?: CarouselRootProps<T>["objectFit"] | undefined
  loop?: CarouselRootProps<T>["loop"] | undefined
  autoplay?: CarouselRootProps<T>["autoplay"] | undefined
  allowMouseDrag?: CarouselRootProps<T>["allowMouseDrag"] | undefined
  onPageChange?: CarouselRootProps<T>["onPageChange"] | undefined
}

type GalleryTemplateInheritedProps<T extends ElementType> =
  GalleryTemplateBaseProps<T> & {
    imageAs?: GalleryTemplateImageComponent<T> | undefined
    thumbnailImageAs?: GalleryTemplateImageComponent<T> | undefined
  }

export type GalleryTemplateProps<T extends ElementType = typeof Image> =
  | (GalleryTemplateBaseProps<T> & {
      imageAs: GalleryTemplateImageComponent<T>
      thumbnailImageAs?: GalleryTemplateImageComponent<T> | undefined
    })
  | (IsDefaultImageComponent<T> extends true
      ? GalleryTemplateBaseProps<T> & {
          imageAs?: GalleryTemplateImageComponent<T> | undefined
          thumbnailImageAs?: GalleryTemplateImageComponent<T> | undefined
        }
      : never)

interface GalleryControlsProps {
  className?: string | undefined
  controlPosition?:
    | ComponentPropsWithoutRef<typeof Carousel.Control>["controlPosition"]
    | undefined
  indicatorsClassName?: string | undefined
  items: { id: string }[]
  nextIcon: IconType
  nextTriggerClassName?: string | undefined
  previousIcon: IconType
  previousTriggerClassName?: string | undefined
  showControls: boolean
  showIndicators: boolean
}

const GalleryControls = ({
  className,
  controlPosition,
  indicatorsClassName,
  items,
  nextIcon,
  nextTriggerClassName,
  previousIcon,
  previousTriggerClassName,
  showControls,
  showIndicators,
}: GalleryControlsProps) => {
  if (!(showControls || showIndicators)) {
    return null
  }

  const showControlSpacer = showControls && showIndicators

  return (
    <Carousel.Control className={className} controlPosition={controlPosition}>
      {showControls && (
        <Carousel.Previous
          className={previousTriggerClassName}
          icon={previousIcon}
        />
      )}
      {showControlSpacer && <div className="flex-1" />}
      {showIndicators && (
        <Carousel.Indicators className={indicatorsClassName}>
          {items.map((item, index) => (
            <Carousel.Indicator
              index={index}
              key={`gallery-indicator-${item.id}`}
            />
          ))}
        </Carousel.Indicators>
      )}
      {showControlSpacer && <div className="flex-1" />}
      {showControls && (
        <Carousel.Next className={nextTriggerClassName} icon={nextIcon} />
      )}
    </Carousel.Control>
  )
}

const GalleryTemplateInherited = <T extends ElementType = typeof Image>({
  items,
  orientation,
  carouselWidth,
  carouselHeight,
  fitParent = false,
  carouselClassName,
  slidesClassName,
  mainClassName,
  thumbnailsClassName,
  thumbnailsScrollAreaClassName,
  thumbnailsListClassName,
  thumbnailClassName,
  renderThumbnail,
  renderSlide,
  showControls = false,
  showIndicators = false,
  showAutoplay = false,
  controlsClassName,
  indicatorsClassName,
  controlPosition = "unset",
  prevIcon = "token-icon-carousel-prev",
  nextIcon = "token-icon-carousel-next",
  previousTriggerClassName,
  nextTriggerClassName,
  autoplayTriggerClassName,
  aspectRatio,
  size,
  objectFit,
  loop,
  autoplay,
  allowMouseDrag,
  imageAs,
  onPageChange,
  thumbnailImageAs,
  ...galleryProps
}: GalleryTemplateInheritedProps<T>) => {
  const resolvedItems = resolveSlides(items, renderSlide)
  const resolvedOrientation = orientation ?? "vertical"
  const resolvedCarouselWidth =
    carouselWidth ?? (fitParent ? "100%" : undefined)
  const resolvedCarouselHeight = carouselHeight
  const resolvedCarouselProps = {
    allowMouseDrag,
    aspectRatio: aspectRatio ?? "portrait",
    autoplay,
    className: carouselClassName,
    height: resolvedCarouselHeight,
    imageAs,
    loop: loop ?? true,
    objectFit: objectFit ?? "cover",
    onPageChange,
    orientation: resolvedOrientation,
    size: size ?? "full",
    width: resolvedCarouselWidth,
  } satisfies Omit<CarouselRootProps<T>, "children" | "slideCount" | "page">

  return (
    <GalleryInheritedRoot<T>
      {...galleryProps}
      carouselProps={resolvedCarouselProps}
      rendererCapability={rendererCapability}
      items={resolvedItems}
      orientation={resolvedOrientation}
      thumbnailImageAs={thumbnailImageAs ?? imageAs}
    >
      {renderThumbnail === undefined ? (
        <Gallery.Thumbnails
          className={thumbnailsClassName}
          listClassName={thumbnailsListClassName}
          scrollAreaClassName={thumbnailsScrollAreaClassName}
          thumbnailClassName={thumbnailClassName}
        />
      ) : (
        <Gallery.Thumbnails<T>
          className={thumbnailsClassName}
          items={resolvedItems}
          listClassName={thumbnailsListClassName}
          renderThumbnail={renderThumbnail}
          scrollAreaClassName={thumbnailsScrollAreaClassName}
          thumbnailClassName={thumbnailClassName}
        />
      )}
      <Gallery.Main className={mainClassName}>
        <Gallery.Carousel>
          <Gallery.Slides className={slidesClassName} />
          <GalleryControls
            className={controlsClassName}
            controlPosition={controlPosition}
            indicatorsClassName={indicatorsClassName}
            items={resolvedItems}
            nextIcon={nextIcon}
            nextTriggerClassName={nextTriggerClassName}
            previousIcon={prevIcon}
            previousTriggerClassName={previousTriggerClassName}
            showControls={showControls}
            showIndicators={showIndicators}
          />
          {showAutoplay && (
            <Carousel.Autoplay className={autoplayTriggerClassName} />
          )}
        </Gallery.Carousel>
      </Gallery.Main>
    </GalleryInheritedRoot>
  )
}

export const GalleryTemplate = <T extends ElementType = typeof Image>(
  props: GalleryTemplateProps<T>,
) => <GalleryTemplateInherited<T> {...props} />
