"use client";

import { useEffect } from "react";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import { asRecord } from "@/components/product-detail/utils/value-utils";

export function useProductDetailDebugLog(product: StorefrontProduct | null) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !product) {
      return;
    }

    const metadata = asRecord(product.metadata);

    console.info("[PDP] loaded product", {
      id: product.id,
      handle: product.handle,
      imageCount: product.images?.length ?? 0,
      categoryCount: product.categories?.length ?? 0,
      variantCount: product.variants?.length ?? 0,
      hasShortDescription: typeof metadata?.short_description === "string",
      contentSectionsCount: Array.isArray(metadata?.content_sections)
        ? metadata.content_sections.length
        : 0,
      hasContentSectionsMap: asRecord(metadata?.content_sections_map) !== null,
    });
  }, [product]);
}
