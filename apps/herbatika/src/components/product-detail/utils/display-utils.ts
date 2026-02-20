import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import type { HttpTypes } from "@medusajs/types";
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-detail/product-detail.constants";
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers";

export const resolveGalleryItems = (
  imageUrls: string[],
  title: string | null | undefined,
): GalleryItem[] => {
  if (imageUrls.length === 0) {
    return [
      {
        id: "gallery-fallback",
        src: PRODUCT_FALLBACK_IMAGE,
        alt: title || "Produkt",
      },
    ];
  }

  return imageUrls.map((imageUrl, index) => ({
    id: `gallery-${index}`,
    src: imageUrl,
    alt: title ? `${title} (${index + 1})` : `Produkt (${index + 1})`,
  }));
};

export const resolveProductHighlights = (
  summaryText: string,
  categories: HttpTypes.StoreProductCategory[],
): string[] => {
  const sentenceCandidates = summaryText
    .split(/[\.\!\?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 3);

  if (sentenceCandidates.length >= 3) {
    return sentenceCandidates;
  }

  const categoryHighlights = categories
    .map((category) => normalizeCategoryName(category.name))
    .filter((name) => name.length > 0)
    .slice(0, 3)
    .map((name) => `Vhodné pre oblasť ${name.toLowerCase()}`);

  const merged = [...sentenceCandidates];
  for (const categoryHighlight of categoryHighlights) {
    if (merged.length >= 3) {
      break;
    }

    merged.push(categoryHighlight);
  }

  if (merged.length > 0) {
    return merged;
  }

  return [
    "Obnovuje funkciu bunky.",
    "Posilnenie obranyschopnosti.",
    "Optimalizácia hladiny cholesterolu.",
  ];
};
