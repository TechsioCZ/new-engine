import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery"

import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-detail/product-detail.constants"

const SENTENCE_SEPARATOR_PATTERN = /[.!?]/

export const resolveGalleryItems = (
  imageUrls: string[],
  title: string | null | undefined,
  fallbackProductLabel: string,
): GalleryItem[] => {
  if (imageUrls.length === 0) {
    return [
      {
        alt: title || fallbackProductLabel,
        id: "gallery-fallback",
        src: PRODUCT_FALLBACK_IMAGE,
      },
    ]
  }

  return imageUrls.map((imageUrl, index) => ({
    alt: `${title || fallbackProductLabel} (${index + 1})`,
    id: `gallery-${index}`,
    src: imageUrl,
  }))
}

export const resolveProductHighlights = (summaryText: string): string[] =>
  summaryText
    .split(SENTENCE_SEPARATOR_PATTERN)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 3)
