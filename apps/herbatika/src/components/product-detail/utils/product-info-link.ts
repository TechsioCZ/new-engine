import type { HttpTypes } from "@medusajs/types";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers";
import { asRecord, asString } from "@/components/product-detail/utils/value-utils";
import { createBrandSlug } from "@/lib/storefront/brands";

export type ProductInfoLink = {
  href: string | null;
  label: string;
};

export const resolveProductInfoLink = (
  product: StorefrontProduct,
  primaryCategory?: HttpTypes.StoreProductCategory,
): ProductInfoLink | null => {
  const producer = asRecord(
    (product as StorefrontProduct & { producer?: unknown }).producer,
  );
  const producerTitle = asString(producer?.title);

  if (producerTitle) {
    const producerHandle = asString(producer?.handle);
    const producerSlug = createBrandSlug(producerHandle || producerTitle);

    return {
      href: producerSlug ? `/znacka/${producerSlug}` : null,
      label: producerTitle,
    };
  }

  if (!primaryCategory?.handle) {
    return null;
  }

  return {
    href: `/c/${primaryCategory.handle}`,
    label: normalizeCategoryName(primaryCategory.name),
  };
};
