"use client"

import { ActionIcon } from "@techsio/ui-kit/atoms/action-icon"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import {
  Gallery,
  type GalleryItem,
  type GalleryValueChangeDetails,
} from "@techsio/ui-kit/organisms/gallery"
import { FallbackImage } from "@/components/fallback-image"
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

type ProductDetailGalleryLightboxProps = {
  items: GalleryItem[]
  onOpenChange: (open: boolean) => void
  onValueChange: (value: number) => void
  open: boolean
  value: number
}

export function ProductDetailGalleryLightbox({
  items,
  onOpenChange,
  onValueChange,
  open,
  value,
}: ProductDetailGalleryLightboxProps) {
  const maxIndex = Math.max(items.length - 1, 0)
  const safeValue = Math.min(value, maxIndex)
  const hasMultipleImages = items.length > 1
  const lightboxItems: GalleryItem[] = items.map((item, index) => {
    const imageSrc = item.src || FALLBACK_IMAGE_SRC
    const imageAlt = item.alt || `Produkt (${index + 1})`

    return {
      ...item,
      alt: imageAlt,
      content: (
        <span className="flex h-full w-full items-center justify-center">
          <FallbackImage
            alt={imageAlt}
            className="h-full w-full object-contain"
            height={1200}
            loading={index === safeValue ? "eager" : "lazy"}
            quality={90}
            sizes="100vw"
            src={imageSrc}
            width={1200}
          />
        </span>
      ),
      src: imageSrc,
    }
  })

  if (items.length === 0) {
    return null
  }

  const handleOpenChange = ({ open: nextOpen }: { open: boolean }) => {
    onOpenChange(nextOpen)
  }

  const handleValueChange = ({
    value: nextValue,
  }: GalleryValueChangeDetails) => {
    onValueChange(nextValue)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <div className="[&_[data-part=backdrop]]:z-[80] [&_[data-part=backdrop]]:bg-fg-strong/85 [&_[data-part=positioner]]:z-[90]">
      <Dialog
        className="h-full w-full max-w-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none [&_[data-part=title]]:sr-only"
        customTrigger
        hideCloseButton
        onOpenChange={handleOpenChange}
        open={open}
        placement="right"
        portal={false}
        title="Galéria produktu"
      >
        <div className="relative h-dvh max-h-dvh overflow-hidden p-300 text-fg-reverse">
          <ActionIcon
            aria-label="Zavrieť galériu"
            className="absolute top-300 right-300 z-2 bg-transparent text-fg-reverse hover:text-primary focus-visible:outline-fg-reverse active:bg-fg-reverse/25"
            icon="token-icon-close"
            onClick={handleClose}
            size="lg"
          />
          <Gallery
            carouselProps={{
              allowMouseDrag: true,
              aspectRatio: "none",
              height: "100%",
              loop: hasMultipleImages,
              objectFit: "contain",
              size: "full",
              width: "100%",
            }}
            className="h-full min-h-0"
            getThumbnailAriaLabel={({ index }) =>
              `Zobraziť obrázok ${index + 1} v galérii`
            }
            items={lightboxItems}
            onValueChange={handleValueChange}
            orientation="horizontal"
            showThumbnails={hasMultipleImages}
            thumbnailSize={64}
            value={safeValue}
          >
            <Gallery.Main className="h-full min-h-0 flex-1 overflow-hidden bg-transparent">
              <Gallery.Carousel className="h-full min-h-0 w-full">
                <Gallery.Slides className="h-full" />
                {hasMultipleImages ? (
                  <Carousel.Control
                    className="-translate-y-1/2 pointer-events-none absolute inset-x-200 top-1/2 z-1 justify-between bg-transparent p-0 max-md:text-fg-primary"
                    controlPosition="unset"
                  >
                    <Carousel.Previous className="pointer-events-auto aspect-square rounded-full bg-base max-md:shadow-md md:bg-transparent md:hover:bg-transparent" />
                    <Carousel.Next className="pointer-events-auto aspect-square rounded-full bg-base max-md:shadow-md md:bg-transparent md:hover:bg-transparent" />
                  </Carousel.Control>
                ) : null}
              </Gallery.Carousel>
            </Gallery.Main>

            {hasMultipleImages ? (
              <Gallery.Thumbnails
                className="shrink-0"
                listClassName="justify-center gap-100"
              />
            ) : null}
          </Gallery>
        </div>
      </Dialog>
    </div>
  )
}
