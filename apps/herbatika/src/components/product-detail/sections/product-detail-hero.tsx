"use client";

import type { HttpTypes } from "@medusajs/types";
import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import type { ReactNode } from "react";
import { ProductDetailDeliveryInfo } from "@/components/product-detail/sections/product-detail-delivery-info";
import { ProductDetailMediaColumn } from "@/components/product-detail/sections/product-detail-media-column";
import { ProductDetailPurchasePanel } from "@/components/product-detail/sections/product-detail-purchase-panel";
import type {
  ProductOfferState,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";

type ProductDetailHeroProps = {
  children?: ReactNode;
  currentAmountLabel: string;
  discountPercent: number | null;
  displayOriginalLabel: string | null;
  freeShippingThresholdLabel: string;
  galleryItems: GalleryItem[];
  isAdding: boolean;
  offerState: ProductOfferState;
  onAddToCart: () => void;
  onQuantityChange: (quantity: number) => void;
  onVariantChange: (variantId: string | null) => void;
  product: StorefrontProduct;
  productCategories: HttpTypes.StoreProductCategory[];
  productHighlights: string[];
  quantity: number;
  selectedVariantId: string | null;
  unitPriceLabel: string | null;
  variantItems: SelectItem[];
  vipCreditLabel: string | null;
};

export function ProductDetailHero({
  children,
  currentAmountLabel,
  discountPercent,
  displayOriginalLabel,
  freeShippingThresholdLabel,
  galleryItems,
  isAdding,
  offerState,
  onAddToCart,
  onQuantityChange,
  onVariantChange,
  product,
  productCategories,
  productHighlights,
  quantity,
  selectedVariantId,
  unitPriceLabel,
  variantItems,
  vipCreditLabel,
}: ProductDetailHeroProps) {
  return (
    <section className="grid gap-500 xl:grid-cols-2">
      <ProductDetailMediaColumn galleryItems={galleryItems} offerState={offerState} />

      <div className="space-y-300">
        <ProductDetailPurchasePanel
          currentAmountLabel={currentAmountLabel}
          discountPercent={discountPercent}
          displayOriginalLabel={displayOriginalLabel}
          isAdding={isAdding}
          offerState={offerState}
          onAddToCart={onAddToCart}
          onQuantityChange={onQuantityChange}
          onVariantChange={onVariantChange}
          product={product}
          productCategories={productCategories}
          productHighlights={productHighlights}
          quantity={quantity}
          selectedVariantId={selectedVariantId}
          unitPriceLabel={unitPriceLabel}
          variantItems={variantItems}
          vipCreditLabel={vipCreditLabel}
        />

        <ProductDetailDeliveryInfo
          freeShippingThresholdLabel={freeShippingThresholdLabel}
          offerState={offerState}
        />

        {children}
      </div>
    </section>
  );
}
