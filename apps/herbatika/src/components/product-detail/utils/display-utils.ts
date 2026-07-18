import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery"
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-detail/product-detail.constants"

const SENTENCE_SEPARATOR_PATTERN = /[.!?]/

export const resolveGalleryItems = (
  imageUrls: string[],
  title: string | null | undefined,
  fallbackProductLabel: string
): GalleryItem[] => {
  if (imageUrls.length === 0) {
    return [
      {
        id: "gallery-fallback",
        src: PRODUCT_FALLBACK_IMAGE,
        alt: title || fallbackProductLabel,
      },
    ]
  }

  return imageUrls.map((imageUrl, index) => ({
    id: `gallery-${index}`,
    src: imageUrl,
    alt: `${title || fallbackProductLabel} (${index + 1})`,
  }))
}

export const resolveProductHighlights = (
  summaryText: string
): string[] => {
  return summaryText
    .split(SENTENCE_SEPARATOR_PATTERN)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 3)
}
