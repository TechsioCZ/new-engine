"use client";

import type { HttpTypes } from "@medusajs/types";
import { useEffect, useState } from "react";
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants";
import { resolvePriceState } from "@/components/product-card/product-card.pricing";
import { resolveThumbnail } from "@/components/product-card/product-card.thumbnail";

export type HerbatikaProductCardBaseProps = {
  product: HttpTypes.StoreProduct;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
};

export function useHerbatikaProductCardState(
  product: HttpTypes.StoreProduct,
  onImageError?: () => void,
) {
  const productHref = product.handle ? `/p/${product.handle}` : "/#";
  const price = resolvePriceState(product);
  const thumbnail = resolveThumbnail(product);
  const [imageSrc, setImageSrc] = useState(thumbnail);
  const title = product.title || "Produkt";

  useEffect(() => {
    setImageSrc(thumbnail);
  }, [thumbnail]);

  const handleImageError = () => {
    onImageError?.();

    setImageSrc((currentImageSrc) =>
      currentImageSrc === PRODUCT_FALLBACK_IMAGE
        ? currentImageSrc
        : PRODUCT_FALLBACK_IMAGE,
    );
  };

  return {
    handleImageError,
    imageSrc,
    price,
    productHref,
    title,
  };
}
