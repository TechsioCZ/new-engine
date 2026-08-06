/*
 * Gallery — @techsio/ui-kit template.
 *
 * @component Gallery
 * @componentVersion v1.0.1
 * @skill gallery-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the gallery-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

import type { IconType } from "../atoms/icon"
import { Carousel } from "../molecules/carousel"
import type { CarouselRootProps } from "../molecules/carousel"
import { Gallery } from "../organisms/gallery"
import type {
  GalleryItem,
  GalleryProps,
  GalleryRenderThumbnailParams,
} from "../organisms/gallery"

const resolveSlides = (
  items: GalleryItem[],
  renderSlide?: (params: { item: GalleryItem; index: number }) => ReactNode,
) => {
  if (renderSlide === undefined) {
    return items
  }

  return items.map((item, index) => ({
    ...item,
    content: renderSlide({ index, item }),
  }))
}

export type GalleryTemplateProps<T extends ElementType = "img"> = Omit<
  GalleryProps<T>,
  "children" | "items" | "carouselProps"
> & {
  items: GalleryItem[]
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
    | ((params: GalleryRenderThumbnailParams) => ReactNode)
    | undefined
  renderSlide?:
    | ((params: { item: GalleryItem; index: number }) => ReactNode)
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
  imageAs?: CarouselRootProps<T>["imageAs"] | undefined
  onPageChange?: CarouselRootProps<T>["onPageChange"] | undefined
}

interface GalleryControlsProps {
  className?: string | undefined
  controlPosition?:
    | ComponentPropsWithoutRef<typeof Carousel.Control>["controlPosition"]
    | undefined
  indicatorsClassName?: string | undefined
  items: GalleryItem[]
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

export const GalleryTemplate = <T extends ElementType = "img">({
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
}: GalleryTemplateProps<T>) => {
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
    <Gallery
      {...galleryProps}
      carouselProps={resolvedCarouselProps}
      items={resolvedItems}
      orientation={resolvedOrientation}
      thumbnailImageAs={thumbnailImageAs ?? imageAs}
    >
      <Gallery.Thumbnails
        className={thumbnailsClassName}
        listClassName={thumbnailsListClassName}
        renderThumbnail={renderThumbnail}
        scrollAreaClassName={thumbnailsScrollAreaClassName}
        thumbnailClassName={thumbnailClassName}
      />
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
    </Gallery>
  )
}
