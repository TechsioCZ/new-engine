"use client";

import type { HttpTypes } from "@medusajs/types";
import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import type { ReactNode } from "react";
import { ProductDetailDeliveryInfo } from "@/components/product-detail/sections/product-detail-delivery-info";
import { ProductDetailMediaColumn } from "@/components/product-detail/sections/product-detail-media-column";
import { ProductDetailPurchasePanel } from "@/components/product-detail/sections/product-detail-purchase-panel";
import type {
  ProductMediaFact,
  ProductOfferState,
  Product,
} from "@/components/product-detail/product-detail.types";

type ProductDetailHeroProps = {
  children?: ReactNode;
  canAddToCart: boolean;
  currentAmountLabel: string;
  discountPercent: number | null;
  displayOriginalLabel: string | null;
  freeShippingThresholdLabel: string | null;
  galleryItems: GalleryItem[];
  mediaFacts: ProductMediaFact[];
  isAdding: boolean;
  maxQuantity: number;
  offerState: ProductOfferState;
  onAddToCart: () => void;
  onQuantityChange: (quantity: number) => void;
  onVariantChange: (variantId: string | null) => void;
  product: Product;
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
  canAddToCart,
  currentAmountLabel,
  discountPercent,
  displayOriginalLabel,
  freeShippingThresholdLabel,
  galleryItems,
  mediaFacts,
  isAdding,
  maxQuantity,
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
    <section className="grid min-w-0 max-w-full gap-500 sm:px-product-detail lg:grid-cols-2">
      <ProductDetailMediaColumn
        discountPercent={discountPercent}
        galleryItems={galleryItems}
        mediaFacts={mediaFacts}
      />

      <div className="min-w-0 space-y-300">
        <ProductDetailPurchasePanel
          canAddToCart={canAddToCart}
          currentAmountLabel={currentAmountLabel}
          displayOriginalLabel={displayOriginalLabel}
          isAdding={isAdding}
          maxQuantity={maxQuantity}
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
