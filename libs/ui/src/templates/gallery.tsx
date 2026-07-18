import type { ElementType, ReactNode } from "react"

import type { IconType } from "../atoms/icon"
import { Carousel, type CarouselRootProps } from "../molecules/carousel"
import {
  Gallery,
  type GalleryItem,
  type GalleryProps,
  type GalleryRenderThumbnailParams,
} from "../organisms/gallery"

function resolveSlides(
  items: GalleryItem[],
  renderSlide?:
    | ((params: { item: GalleryItem; index: number }) => ReactNode)
    | undefined
) {
  if (!renderSlide) {
    return items
  }

  return items.map((item, index) => ({
    ...item,
    content: renderSlide({ item, index }),
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
  controlPosition?: "top" | "bottom" | "side" | "unset" | undefined
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

export function GalleryTemplate<T extends ElementType = "img">({
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
}: GalleryTemplateProps<T>) {
  const resolvedItems = resolveSlides(items, renderSlide)
  const resolvedOrientation = orientation ?? "vertical"
  const resolvedCarouselWidth =
    carouselWidth ?? (fitParent ? "100%" : undefined)
  const resolvedCarouselHeight = carouselHeight
  const resolvedCarouselProps = {
    orientation: resolvedOrientation,
    aspectRatio: aspectRatio ?? "portrait",
    size: size ?? "full",
    objectFit: objectFit ?? "cover",
    loop: loop ?? true,
    autoplay,
    allowMouseDrag,
    imageAs,
    onPageChange,
    className: carouselClassName,
    width: resolvedCarouselWidth,
    height: resolvedCarouselHeight,
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
          {(showControls || showIndicators) && (
            <Carousel.Control
              className={controlsClassName}
              controlPosition={controlPosition}
            >
              {showControls && (
                <Carousel.Previous
                  className={previousTriggerClassName}
                  icon={prevIcon}
                />
              )}
              {showControls && showIndicators && <div className="flex-1" />}
              {showIndicators && (
                <Carousel.Indicators className={indicatorsClassName}>
                  {resolvedItems.map((item, index) => (
                    <Carousel.Indicator
                      index={index}
                      key={`gallery-indicator-${item.id}`}
                    />
                  ))}
                </Carousel.Indicators>
              )}
              {showControls && showIndicators && <div className="flex-1" />}
              {showControls && (
                <Carousel.Next
                  className={nextTriggerClassName}
                  icon={nextIcon}
                />
              )}
            </Carousel.Control>
          )}
          {showAutoplay && (
            <Carousel.Autoplay className={autoplayTriggerClassName} />
          )}
        </Gallery.Carousel>
      </Gallery.Main>
    </Gallery>
  )
}
