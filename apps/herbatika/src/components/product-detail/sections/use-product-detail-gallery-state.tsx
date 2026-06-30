"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery"
import { type MouseEvent, type PointerEvent, useRef, useState } from "react"
import { FallbackImage } from "@/components/fallback-image"
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

type UseProductDetailGalleryStateProps = {
  galleryItems: GalleryItem[]
}

export function useProductDetailGalleryState({
  galleryItems,
}: UseProductDetailGalleryStateProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const pendingOpenImageIndexRef = useRef<number | null>(null)

  const cancelPendingOpen = () => {
    pendingOpenImageIndexRef.current = null
  }

  const handleOpenLightbox = (index: number) => {
    setSelectedImageIndex(index)
    setIsLightboxOpen(true)
  }

  const handleMainImagePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.button !== 0) {
      cancelPendingOpen()
      return
    }

    pendingOpenImageIndexRef.current = index
  }

  const handleMainImagePointerUp = () => {
    const pendingIndex = pendingOpenImageIndexRef.current
    cancelPendingOpen()

    if (pendingIndex !== null) {
      handleOpenLightbox(pendingIndex)
    }
  }

  const handleMainImageClick = (
    event: MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.detail === 0) {
      handleOpenLightbox(index)
    }
  }
  const safeSelectedImageIndex = Math.min(
    selectedImageIndex,
    Math.max(galleryItems.length - 1, 0)
  )

  const galleryItemsWithFallback: GalleryItem[] = galleryItems.map(
    (item, index) => {
      const imageSrc = item.src || FALLBACK_IMAGE_SRC
      const imageAlt = item.alt || "Produkt"
      const imageContent = item.content ?? (
        <FallbackImage
          alt={imageAlt}
          className="h-full w-full object-contain"
          height={408}
          loading={index === safeSelectedImageIndex ? "eager" : "lazy"}
          quality={75}
          sizes="(max-width: 767px) 60vw, (max-width: 1023px) 408px, 32vw"
          src={imageSrc}
          width={408}
        />
      )

      return {
        ...item,
        alt: imageAlt,
        src: imageSrc,
        content: (
          <Button
            aria-label={`Otvoriť obrázok ${index + 1} v galérii`}
            className="flex h-full w-full cursor-zoom-in items-center justify-center p-0 active:cursor-grabbing"
            onClick={(event) => handleMainImageClick(event, index)}
            onPointerCancel={cancelPendingOpen}
            onPointerDown={(event) => handleMainImagePointerDown(event, index)}
            onPointerUp={handleMainImagePointerUp}
            size="current"
            theme="unstyled"
            type="button"
          >
            {imageContent}
          </Button>
        ),
        thumbnailContent: item.thumbnailContent ?? (
          <span className="flex h-full w-full items-center justify-center">
            <FallbackImage
              alt={item.thumbnailAlt || imageAlt}
              className="h-full w-full object-contain"
              height={88}
              quality={60}
              sizes="88px"
              src={item.thumbnailSrc || imageSrc}
              width={88}
            />
          </span>
        ),
      }
    }
  )

  return {
    cancelPendingOpen,
    galleryItemsWithFallback,
    isLightboxOpen,
    safeSelectedImageIndex,
    setIsLightboxOpen,
    setSelectedImageIndex,
  }
}
