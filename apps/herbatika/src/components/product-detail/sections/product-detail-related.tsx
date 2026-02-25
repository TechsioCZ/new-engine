"use client";

import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { ProductCollectionSection } from "@/components/product/product-collection-section";
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
        <ProductCollectionSection
          headerAction={
            <ExtraText className="text-fg-tertiary">{`Nájdené: ${section.products.length}`}</ExtraText>
          }
          headerClassName="items-center gap-200"
          isProductAdding={(product) => isProductAdding(product.id)}
          key={section.id}
          keyPrefix={section.id}
          layout="related"
          onAddToCart={(productToAdd) => {
            onAddToCart(productToAdd);
          }}
          onProductHoverEnd={(hoveredProduct) => {
            onProductHoverEnd(section.id, hoveredProduct);
          }}
          onProductHoverStart={(hoveredProduct) => {
            onProductHoverStart(section.id, hoveredProduct);
          }}
          products={section.products}
          sectionClassName="p-500 lg:p-600"
          title={section.title}
          titleClassName="text-xl font-semibold text-fg-primary"
        />
      ))}
    </>
  );
}
