"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Image as ImageComponent } from "@techsio/ui-kit/atoms/image"
import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import { tv } from "@techsio/ui-kit/utils"
import Image from "next/image"
import { useState } from "react"
import type { VariantProps } from "tailwind-variants"

const galleryStyles = tv({
  slots: {
    root: "",
    mainCarousel: "relative flex h-fit",
    container: "flex-shrink-0",
    scrollArea: "scrollbar-thin max-h-[60svh]",
    list: "flex gap-gallery-sm",
    trigger: [
      "relative flex-shrink-0",
      "aspect-square",
      "overflow-hidden rounded-md border",
      "cursor-pointer transition-all duration-200",
      "p-gallery-trigger",
      "data-[active=true]:border-gallery-trigger-active",
      "brightness-gallery-trigger",
      "hover:brightness-gallery-trigger-active data-[active=true]:brightness-gallery-trigger-active",
    ],
  },
  variants: {
    orientation: {
      horizontal: {
        root: "flex flex-col",
        mainCarousel: "order-1",
        container: "order-2",
        scrollArea: "w-full overflow-x-auto overflow-y-hidden",
        list: "flex-row py-gallery-sm",
      },
      vertical: {
        root: "grid w-full grid-cols-5 gap-gallery-root",
        mainCarousel: "col-span-4",
        container: "col-span-1",
        scrollArea: "h-full overflow-y-auto overflow-x-hidden",
        list: "flex-col px-gallery-list",
      },
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

interface GalleryProps extends VariantProps<typeof galleryStyles> {
  images: CarouselSlide[]
  aspectRatio?: "square" | "portrait" | "landscape" | "wide"
  size?: "sm" | "md" | "lg" | "full"
  className?: string
  thumbnailSize?: number
  carouselSize?: number
}

export function Gallery({
  images,
  aspectRatio = "portrait",
  orientation,
  size = "full",
  thumbnailSize = 60,
  carouselSize = 200,
  className,
}: GalleryProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const { trigger, root, container, scrollArea, list, mainCarousel } =
    galleryStyles({ orientation })

  const handlePageChange = (details: { page: number }) => {
    setCurrentPage(details.page)
  }

  const handleThumbnailClick = (index: number) => {
    // Since we can't programmatically control the carousel,
    // we'll just update our state to show which is active
    setCurrentPage(index)
  }

  return (
    <div className={root({ className })}>
      {/* Thumbnails */}
      <div className={container()}>
        <div className={scrollArea()}>
          <div className={list()}>
            {images.map((image, index) => (
              <Button
                aria-current={currentPage === index ? "true" : "false"}
                aria-label={`Zobrazit obrázek ${index + 1}`}
                className={trigger()}
                data-active={currentPage === index}
                key={image.id}
                onClick={() => handleThumbnailClick(index)}
              >
                <ImageComponent
                  alt={image.alt || `Obrázek produktu ${index + 1}`}
                  as={Image}
                  className="object-cover"
                  height={thumbnailSize}
                  quality={40}
                  src={image.src || ""}
                  width={thumbnailSize}
                />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Carousel */}
      <div className={mainCarousel()}>
        <Carousel
          aspectRatio={aspectRatio}
          loop
          onPageChange={handlePageChange}
          page={currentPage}
          size={size}
          slideCount={images.length}
          height={carouselSize}
          width={carouselSize}
        >
          <Carousel.Slides slides={images} />
        </Carousel>
      </div>
    </div>
  )
}
