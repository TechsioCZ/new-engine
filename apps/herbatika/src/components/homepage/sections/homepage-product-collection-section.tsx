import type { HttpTypes } from "@medusajs/types";
import type { HomepageProductSection } from "@/components/homepage/homepage.types";
import { ProductCollectionSection } from "@/components/product/product-collection-section";
import { TextActionLink } from "@/components/text-action-link";

type HomepageProductCollectionSectionProps = {
  section: HomepageProductSection;
  shouldShowProductSkeleton: boolean;
  isProductAdding: (product: HttpTypes.StoreProduct) => boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function HomepageProductCollectionSection({
  section,
  shouldShowProductSkeleton,
  isProductAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
}: HomepageProductCollectionSectionProps) {
  return (
    <ProductCollectionSection
      headerAction={
        <TextActionLink href={section.viewAllHref} />
      }
      id={section.id}
      isProductAdding={isProductAdding}
      keyPrefix={section.id}
      layout="collection"
      onAddToCart={onAddToCart}
      onProductHoverEnd={onProductHoverEnd}
      onProductHoverStart={onProductHoverStart}
      products={section.products}
      shouldShowSkeleton={shouldShowProductSkeleton}
      title={section.title}
    />
  );
}
