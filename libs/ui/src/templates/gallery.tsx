import type { ElementType, ReactNode } from "react"
import type { IconType } from "../atoms/icon"
import {
  Carousel,
  type CarouselRootProps,
} from "../molecules/carousel"
import {
  Gallery,
  type GalleryItem,
  type GalleryProps,
  type GalleryRenderThumbnailParams,
} from "../organisms/gallery"

function resolveSlides(
  items: GalleryItem[],
  renderSlide?: (params: { item: GalleryItem; index: number }) => ReactNode
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
  carouselWidth?: CarouselRootProps<T>["width"]
  carouselHeight?: CarouselRootProps<T>["height"]
  fitParent?: boolean
  carouselClassName?: string
  slidesClassName?: string
  mainClassName?: string
  thumbnailsClassName?: string
  thumbnailsScrollAreaClassName?: string
  thumbnailsListClassName?: string
  thumbnailClassName?: string
  renderThumbnail?: (params: GalleryRenderThumbnailParams) => ReactNode
  renderSlide?: (params: { item: GalleryItem; index: number }) => ReactNode
  showControls?: boolean
  showIndicators?: boolean
  showAutoplay?: boolean
  controlsClassName?: string
  indicatorsClassName?: string
  controlPosition?: "top" | "bottom" | "side" | "unset"
  prevIcon?: IconType
  nextIcon?: IconType
  previousTriggerClassName?: string
  nextTriggerClassName?: string
  autoplayTriggerClassName?: string
  aspectRatio?: CarouselRootProps<T>["aspectRatio"]
  size?: CarouselRootProps<T>["size"]
  objectFit?: CarouselRootProps<T>["objectFit"]
  loop?: CarouselRootProps<T>["loop"]
  autoplay?: CarouselRootProps<T>["autoplay"]
  allowMouseDrag?: CarouselRootProps<T>["allowMouseDrag"]
  imageAs?: CarouselRootProps<T>["imageAs"]
  onPageChange?: CarouselRootProps<T>["onPageChange"]
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
