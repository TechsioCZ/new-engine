"use client";

import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import type {
  RelatedProductsSection,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";

type ProductDetailRelatedProps = {
  isProductAdding: (productId: string) => boolean;
  onAddToCart: (product: StorefrontProduct) => void;
  onProductHoverEnd: (sectionId: string, product: StorefrontProduct) => void;
  onProductHoverStart: (sectionId: string, product: StorefrontProduct) => void;
  sections: RelatedProductsSection[];
};

export function ProductDetailRelated({
  isProductAdding,
  onAddToCart,
  onProductHoverEnd,
  onProductHoverStart,
  sections,
}: ProductDetailRelatedProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <section
          className="space-y-400 rounded-xl border border-border-secondary bg-surface p-500 lg:p-600"
          key={section.id}
        >
          <header className="flex items-center justify-between gap-200">
            <h2 className="text-xl font-semibold text-fg-primary">{section.title}</h2>
            <ExtraText className="text-fg-tertiary">{`Nájdené: ${section.products.length}`}</ExtraText>
          </header>

          <div className="grid grid-cols-2 gap-400 md:grid-cols-3 xl:grid-cols-5">
            {section.products.map((relatedProduct) => (
              <HerbatikaProductCard
                isAdding={isProductAdding(relatedProduct.id)}
                key={relatedProduct.id}
                onAddToCart={(productToAdd) => {
                  onAddToCart(productToAdd);
                }}
                onProductHoverEnd={(hoveredProduct) => {
                  onProductHoverEnd(section.id, hoveredProduct);
                }}
                onProductHoverStart={(hoveredProduct) => {
                  onProductHoverStart(section.id, hoveredProduct);
                }}
                product={relatedProduct}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
